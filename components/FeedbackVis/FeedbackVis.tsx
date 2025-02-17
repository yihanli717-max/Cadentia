import React, { useRef, useEffect, useState } from "react";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import Menu from "@/components/FeedbackVis/Menu";
import PrepStation from "@/components/FeedbackVis/PrepStation";
import Legend from "@/components/FeedbackVis/Legend/Legend";
import { cn, getColor, normalizeAndTransform, eventTracker } from "@/lib/utils";
import { cosineSimilarity } from "fast-cosine-similarity";
import * as d3 from "d3";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);

  const [maxR, setMaxR] = useState(0);
  const [minR, setMinR] = useState(0);

  const {
    clusterDimension,
    numericalDimension,
    colorDimension,
    hoveredProvider,
    hoveredItem,
    hoveredSentence,
    setHoveredItem,
    searchedEmeddings,
    similarityThreshold,
    currentSelectedItems,
    currentRevisionItem,
  } = useSharedConfigStore();
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // Calculate the container dimensions
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 40, height: height - 100 });
      }
    };

    // Initial dimensions calculation
    updateDimensions();

    // Recalculate dimensions on window resize
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !dimensions || allFeedback.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    let hoverTimer: NodeJS.Timeout | null = null;

    type NodeType = d3.HierarchyCircularNode<{
      id: string;
      group: string;
      value: number;
      embeddings: number[];
      sentences: number[];
      source: string;
    }>;

    // Calculate nodes
    const calculateNodes = () => {
      const values = allFeedback.map((item: any) => item[numericalDimension]);
      const transformedValues = normalizeAndTransform(values, (v) => v);

      const feedbackWithTransformedValues = allFeedback.map((item, index) => ({
        ...item,
        transformedValues: transformedValues[index],
      }));

      const groupedFeedback = d3.group(
        feedbackWithTransformedValues,
        (item: any) => item[clusterDimension],
      );

      const data = {
        children: Array.from(groupedFeedback, ([group, children]) => ({
          group,
          children: children.map((item) => ({
            id: item.id,
            group,
            value: item.transformedValues,
            color: item[colorDimension],
            embeddings: item.embeddings,
            sentences: item.detection,
            source: item.source,
          })),
        })),
      };

      const pack = d3.pack<any>().size([width, height]).padding(1);
      return pack(d3.hierarchy(data).sum((d) => (d as any).value)).leaves();
    };

    // Create node groups
    const createNodeGroups = (
      enter: d3.Selection<d3.EnterElement, NodeType, SVGSVGElement, unknown>,
    ) => {
      const group = enter.append<SVGGElement>("g");

      // Create filled circle
      const fillCircle = group
        .append<SVGCircleElement>("circle")
        .attr("class", "fill-circle")
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", 0)
        .attr("fill", getFillColor)
        // .attr("stroke", getStrokeColor)
        .attr("stroke", null)
        .attr("stroke-width", 0)
        .attr("opacity", getCircleOpacity);

      // Animate circle radius
      fillCircle
        .transition()
        .duration(300)
        .attr("r", (d) => d.r);

      // Attach event listeners
      fillCircle
        .on("click", handleClick)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

      // Create bar-container circle
      group
        .append<SVGCircleElement>("circle")
        .attr("class", "bar-container-circle")
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r - 6)
        .attr("fill", "none")
        .attr("stroke-dasharray", (d) => `0 ${2 * Math.PI * d.r}`)
        .attr("stroke-linecap", "round");

      // Create bar circle
      group
        .append<SVGCircleElement>("circle")
        .attr("class", "bar-circle")
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r - 6)
        .attr("fill", "none")
        .attr("stroke-dasharray", (d) => `0 ${2 * Math.PI * d.r}`)
        .attr("stroke-linecap", "round");

      // Create progress circle
      group
        .append<SVGCircleElement>("circle")
        .attr("class", "progress-circle")
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!)
        .attr("r", (d) => d.r + 4)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round")
        .each(function (d) {
          const circumference = 2 * Math.PI * (d.r + 4);
          d3.select(this)
            .attr("stroke-dasharray", circumference)
            .attr("stroke-dashoffset", circumference);
        });

      return group;
    };

    // Handle click event
    const handleClick = (event: MouseEvent, d: any) => {
      // console.log("Clicked on feedback", d.data.id);

      if (event.shiftKey) {
        // console.log("Shift key pressed");
        event.preventDefault();

        const { similarityThreshold } = useSharedConfigStore.getState();
        const clickedEmbeddings = allFeedback.find(
          (item) => item.id === d.data.id,
        )?.embeddings as number[];

        if (!clickedEmbeddings) return;

        const matchedIds = allFeedback
          .filter((item) => {
            if (!item.embeddings) return false;
            const similarity = cosineSimilarity(
              clickedEmbeddings,
              item.embeddings,
            );
            return similarity > similarityThreshold;
          })
          .map((item) => item.id);

        const { currentSelectedItems, setCurrentSelectedItems } =
          useSharedConfigStore.getState();
        const combinedIds = Array.from(
          new Set([...currentSelectedItems, ...matchedIds]),
        );
        setCurrentSelectedItems(combinedIds);

        eventTracker({
          action: "add all similar feedback to prepstation",
          data: {
            feedbackID: d.data.id,
            similarIDs: matchedIds,
          },
        });
        return;
      }

      const { currentRevisionItem } = useSharedConfigStore.getState();
      const { revisionList, updateRevision } = useRevisionListStore.getState();
      const currentRevision = revisionList?.find(
        (item) => item.id === currentRevisionItem,
      );
      // console.log(currentRevision);

      if (currentRevision?.feedback?.includes(d.data.id)) {
        // console.log("Remove feedback from revision");
        const newRevisionFeedback = currentRevision.feedback.filter(
          (id) => id !== d.data.id,
        );
        updateRevision({
          id: currentRevisionItem,
          feedback: newRevisionFeedback || [],
          conversation: currentRevision?.conversation || [],
          revision: currentRevision?.revision || [],
        });

        eventTracker({
          action: "remove feedback from prepstation",
          data: {
            feedbackID: d.data.id,
          },
        });
      } else {
        // console.log("Add feedback to selected feedback");
        const { currentSelectedItems, setCurrentSelectedItems } =
          useSharedConfigStore.getState();

        if (currentSelectedItems.includes(d.data.id)) {
          eventTracker({
            action: "remove feedback to prepstation",
            data: {
              feedbackID: d.data.id,
            },
          });
        } else {
          eventTracker({
            action: "add feedback to prepstation",
            data: {
              feedbackID: d.data.id,
            },
          });
        }

        const newSelectedFeedbacks = currentSelectedItems.includes(d.data.id)
          ? currentSelectedItems.filter((id) => id !== d.data.id)
          : [...currentSelectedItems, d.data.id];

        setCurrentSelectedItems(newSelectedFeedbacks);
        // console.log(newSelectedFeedbacks);
      }
    };

    // Handle mouse over event
    const handleMouseOver = (event: MouseEvent, d: any) => {
      hoverTimer = setTimeout(() => {
        setHoveredItem(d.data.id);
        eventTracker({
          action: "hover on feedback",
          data: {
            feedbackID: d.data.id,
          },
        });
      }, 1500);
      const group = d3.select(
        (event.currentTarget as Element).parentNode as SVGGElement,
      );
      const progressCircle = group.select<SVGCircleElement>(".progress-circle");

      // Reset progress circle
      progressCircle
        .interrupt()
        .attr("stroke-dashoffset", (d: any) => 2 * Math.PI * (d.r + 4))
        .attr("stroke", "#00b5ff")
        .attr("stroke-opacity", 0);

      // Animate progress circle
      progressCircle
        .transition()
        .duration(2000)
        .attr("stroke-opacity", 1)
        .attr("stroke-dashoffset", 0)
        .on("end", () => setHoveredItem(d.data.id));
    };

    // Handle mouse out event
    const handleMouseOut = (event: MouseEvent, d: any) => {
      hoverTimer && clearTimeout(hoverTimer);
      const group = d3.select(
        (event.currentTarget as Element).parentNode as SVGGElement,
      );
      const progressCircle = group
        .select<SVGCircleElement>(".progress-circle")
        .attr("r", (d: any) => d.r + 4);

      // Stop animation and reset progress circle
      progressCircle
        .interrupt()
        .attr("stroke", "transparent")
        .attr("stroke-dashoffset", (d: any) => 2 * Math.PI * (d.r + 4));

      setHoveredItem(null);
    };

    // Get stroke color based on selection state
    // const getStrokeColor = (d: any) =>
    //   currentRevision?.feedback?.includes(d.data.id) ? "#34d399" : null;

    // Get circle opacity based on selection state
    const getCircleOpacity = (d: any) =>
      currentSelectedItems.includes(d.data.id) ||
      currentRevision?.feedback?.includes(d.data.id)
        ? 1
        : 0.8;

    // Get cilcle fill color based on categorical dimension
    const getFillColor = (d: any) =>
      currentSelectedItems.includes(d.data.id) ||
      currentRevision?.feedback?.includes(d.data.id)
        ? "#e5e6e6"
        : getColor(colorDimension)(d.data.color as never);

    // Setup simulation
    const setupSimulation = (nodes: any[]) => {
      const simulation = d3
        .forceSimulation(nodes)
        .force("x", d3.forceX(width / 2).strength(0.01))
        .force("y", d3.forceY(height / 2).strength(0.01))
        .force("cluster", forceCluster())
        .force("collide", forceCollide())
        .on("tick", () => {
          node.each(function (d) {
            const group = d3.select(this);

            d.x = Math.max(d.r, Math.min(width - d.r, d.x!));
            d.y = Math.max(d.r, Math.min(height - d.r, d.y!));

            group
              .select<SVGCircleElement>(".fill-circle")
              .attr("cx", d.x!)
              .attr("cy", d.y!);

            group
              .select<SVGCircleElement>(".bar-circle")
              .attr("cx", d.x!)
              .attr("cy", d.y!);

            group
              .select<SVGCircleElement>(".bar-container-circle")
              .attr("cx", d.x!)
              .attr("cy", d.y!);

            group
              .select<SVGCircleElement>(".progress-circle")
              .attr("cx", d.x!)
              .attr("cy", d.y!);
          });
        });

      return simulation;
    };

    // Main logic flow
    const nodes = calculateNodes();
    setMinR(d3.min(nodes, (d) => d.r)!);
    setMaxR(d3.max(nodes, (d) => d.r)!);

    // Store bubble radii for future reference
    const radiiMap: Record<string, number> = {};
    nodes.forEach((node) => {
      radiiMap[node.data.id] = node.r;
    });
    useSharedConfigStore.getState().setBubbleRadii(radiiMap);

    const node = svg
      .selectAll<SVGGElement, any>("g")
      .data(nodes, (d: any) => d.data.id)
      .join(
        (enter) => createNodeGroups(enter),
        (update) =>
          update.each(function (d) {
            const group = d3.select(this);
            group
              .select(".fill-circle")
              .transition()
              .duration(300)
              .attr("fill", getFillColor)
              .attr("r", d.r);
          }),
        (exit) =>
          exit.call((exit) =>
            exit
              .selectAll("circle")
              .transition()
              .duration(300)
              .attr("r", 0)
              .remove(),
          ),
      );

    // Apply drag behavior only to fill circles
    node
      .selectAll<
        SVGCircleElement,
        d3.HierarchyCircularNode<any>
      >(".fill-circle")
      .call(
        d3
          .drag<SVGCircleElement, d3.HierarchyCircularNode<any>>() // Explicitly type the drag behavior
          .on("start", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const simulation = setupSimulation(nodes);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [
    dimensions,
    allFeedback,
    clusterDimension,
    numericalDimension,
    colorDimension,
    allFeedback.length,
  ]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg
      .selectAll<SVGGElement, d3.HierarchyCircularNode<any>>("g")
      .select(".progress-circle")
      .attr("r", (d) => d.r + 4)
      .attr("stroke-dasharray", (d: any) => 2 * Math.PI * (d.r + 4));
  }, [numericalDimension]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg
      .selectAll<SVGGElement, d3.HierarchyCircularNode<any>>("g")
      .select(".bar-container-circle")
      .attr("opacity", 0.1)
      .attr("stroke-width", 3)
      .attr("stroke", (d) => (searchedEmeddings ? "#ffffff" : null))
      .attr(
        "stroke-dasharray",
        (d) => `${2 * Math.PI * d.r} ${2 * Math.PI * d.r}`,
      )
      .attr("r", (d) => d.r - 6);

    svg
      .selectAll<SVGGElement, d3.HierarchyCircularNode<any>>("g")
      .select(".bar-circle")
      .transition()
      .duration(300)
      .attr("opacity", 0.8)
      .attr("stroke-width", 3)
      .attr("stroke", (d) => (searchedEmeddings ? "#ffffff" : null))
      .attr("stroke-dasharray", (d) =>
        searchedEmeddings
          ? `${2 * Math.PI * d.r * cosineSimilarity(searchedEmeddings, d.data.embeddings)} ${
              2 * Math.PI * d.r
            }`
          : `0 ${2 * Math.PI * d.r}`,
      )
      .attr("r", (d) => d.r - 6);
  }, [searchedEmeddings, clusterDimension, numericalDimension, colorDimension]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Common cleanup operations
    svg.select("defs").remove();

    // Get all node references
    const fillCircles = svg.selectAll<SVGCircleElement, any>(".fill-circle");
    const barCircles = svg.selectAll<SVGCircleElement, any>(".bar-circle");
    const barContainerCircles = svg.selectAll<SVGCircleElement, any>(
      ".bar-container-circle",
    );
    const progressCircle = svg.selectAll<SVGCircleElement, any>(
      ".progress-circle",
    );

    // Generic style reset for all elements
    const resetStyles = () => {
      console.log("Resetting styles");
      fillCircles
        .interrupt()
        .attr("filter", null)
        .attr("opacity", 0.8)
        .attr("stroke", null)
        .attr("stroke-width", 0);

      barCircles.interrupt().attr("filter", null);
      barContainerCircles.interrupt().attr("filter", null);

      progressCircle
        .interrupt()
        .attr("stroke-dashoffset", (d: any) => 2 * Math.PI * (d.r + 4))
        .attr("stroke", "#00b5ff")
        .attr("stroke-opacity", 0);
    };

    // Handle hover item state effects
    const handleHoverItem = () => {
      // console.log("Hovered on feedback", hoveredItem);
      // Create glow filter for hover effect
      const defs = svg.append("defs");
      defs
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", "1.5")
        .attr("result", "coloredBlur");

      // Highlight hovered item
      fillCircles.filter((d) => d.data.id === hoveredItem).attr("opacity", 1);

      // Animate progress circle
      progressCircle
        .filter((d) => d.data.id === hoveredItem)
        .attr("stroke-opacity", 1)
        .attr("stroke-dashoffset", 0);

      // Cache embeddings data for performance
      const hoveredEmbeddings = allFeedback.find(
        (item) => item.id === hoveredItem,
      )?.embeddings as number[];

      // Reusable similarity effect applicator
      const applySimilarityEffects = (selection: any) => {
        selection.attr("filter", (d: any) =>
          cosineSimilarity(hoveredEmbeddings, d.data.embeddings) <
          similarityThreshold
            ? "url(#glow)"
            : null,
        );
      };

      // Apply effects to non-hovered items
      fillCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection
            .attr("opacity", (d: any) =>
              cosineSimilarity(hoveredEmbeddings, d.data.embeddings) >
                similarityThreshold ||
              currentSelectedItems.includes(d.data.id) ||
              currentRevision?.feedback?.includes(d.data.id)
                ? 1
                : 0.8,
            )
            .attr("stroke", function (d: any) {
              if (
                cosineSimilarity(hoveredEmbeddings, d.data.embeddings) >
                similarityThreshold
              ) {
                const fillColor = d3.select(this).attr("fill");
                const color = d3.hsl(fillColor);

                if (!color.displayable()) return "#333";

                color.l = Math.max(0, color.l * 0.8);
                return color.toString();
              }
              return null;
            })
            .attr("stroke-width", (d: any) =>
              cosineSimilarity(hoveredEmbeddings, d.data.embeddings) >
              similarityThreshold
                ? 3
                : 0,
            );
        });

      barCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection.attr("opacity", (d: any) =>
            cosineSimilarity(hoveredEmbeddings, d.data.embeddings) >
              similarityThreshold ||
            currentSelectedItems.includes(d.data.id) ||
            currentRevision?.feedback?.includes(d.data.id)
              ? 1
              : 0.8,
          );
        });

      barContainerCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects);
    };

    const handleHoverSentence = () => {
      // console.log("Hovered on sentence", hoveredSentence);
      // Create glow filter for hover effect
      const defs = svg.append("defs");
      defs
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", "1.5")
        .attr("result", "coloredBlur");

      // Highlight hovered item
      fillCircles
        .filter((d) => d.data.sentences.includes(hoveredSentence))
        .attr("opacity", 1);

      // Reusable similarity effect applicator
      const applySimilarityEffects = (selection: any) => {
        selection.attr("filter", (d: any) =>
          d.data.sentences.includes(hoveredSentence) ? null : "url(#glow)",
        );
      };

      // Apply effects to non-hovered items
      fillCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection
            .attr("opacity", (d: any) =>
              d.data.sentences.includes(hoveredSentence) ? 1 : 0.8,
            )
            .attr("stroke", function (d: any) {
              if (d.data.sentences.includes(hoveredSentence)) {
                const fillColor = d3.select(this).attr("fill");
                const color = d3.hsl(fillColor);

                if (!color.displayable()) return "#333";

                color.l = Math.max(0, color.l * 0.7);
                return color.toString();
              }
              return null;
            })
            .attr("stroke-width", (d: any) =>
              d.data.sentences.includes(hoveredSentence) ? 3 : 0,
            );
        });

      barCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection.attr("opacity", (d: any) =>
            d.data.sentences.includes(hoveredSentence) ? 1 : 0.8,
          );
        });
    };

    const handleHoverProvider = () => {
      // console.log("Hovered on provider", hoveredProvider);
      // Create glow filter for hover effect
      const defs = svg.append("defs");
      defs
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", "1.5")
        .attr("result", "coloredBlur");

      // Highlight hovered item
      fillCircles
        .filter((d) => d.data.source === hoveredProvider)
        .attr("opacity", 1);

      // Reusable similarity effect applicator
      const applySimilarityEffects = (selection: any) => {
        selection.attr("filter", (d: any) =>
          d.data.source === hoveredProvider ? null : "url(#glow)",
        );
      };

      // Apply effects to non-hovered items
      fillCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection
            .attr("opacity", (d: any) =>
              d.data.source === hoveredProvider ? 1 : 0.8,
            )
            .attr("stroke", function (d: any) {
              if (d.data.source === hoveredProvider) {
                const fillColor = d3.select(this).attr("fill");
                const color = d3.hsl(fillColor);

                if (!color.displayable()) return "#333";

                color.l = Math.max(0, color.l * 0.7);
                return color.toString();
              }
              return null;
            })
            .attr("stroke-width", (d: any) =>
              d.data.source === hoveredProvider ? 3 : 0,
            );
        });

      barCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects)
        .call((selection) => {
          selection.attr("opacity", (d: any) =>
            d.data.source === hoveredProvider ? 1 : 0.8,
          );
        });
    };

    // Handle selection state when no hovering
    const handleSelection = () => {
      // console.log("Selected feedbacks", currentSelectedItems);
      fillCircles
        .transition()
        .duration(300)
        .attr("fill", (d) =>
          currentSelectedItems.includes(d.data.id) ||
          currentRevision?.feedback?.includes(d.data.id)
            ? "#e5e6e6"
            : getColor(colorDimension)(d.data.color as never),
        );
    };

    // Execute main logic flow
    resetStyles();
    hoveredItem
      ? handleHoverItem()
      : hoveredSentence
        ? handleHoverSentence()
        : hoveredProvider
          ? handleHoverProvider()
          : handleSelection();
  }, [
    hoveredSentence,
    hoveredProvider,
    hoveredItem,
    similarityThreshold,
    allFeedback,
    currentSelectedItems,
    currentRevision?.feedback,
  ]);

  return (
    <div ref={containerRef} className={cn(props.classes, "relative")}>
      {/* <div className="absolute">{hoveredItem}</div> */}
      {dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-pointer absolute bottom-6 z-50"
        ></svg>
      )}
      <Menu classes="absolute top-0 left-1" />
      <PrepStation />
      <Legend classes="absolute bottom-2 left-3" minR={minR} maxR={maxR} />
    </div>
  );
};

const centroid = (nodes: any[]) => {
  let x = 0,
    y = 0,
    z = 0;
  for (const d of nodes) {
    let k = d.r ** 2;
    x += d.x * k;
    y += d.y * k;
    z += k;
  }
  return { x: x / z, y: y / z };
};

// Define forces
const forceCluster = () => {
  const strength = 0.2;
  let nodes: any[];

  function force(alpha: number) {
    const centroids = d3.rollup(nodes, centroid, (d) => d.data.group);
    const l = alpha * strength;
    for (const d of nodes) {
      const { x: cx, y: cy } = centroids.get(d.data.group)!;
      d.vx -= (d.x - cx) * l;
      d.vy -= (d.y - cy) * l;
    }
  }

  force.initialize = (_: any) => (nodes = _);

  return force;
};

const forceCollide = () => {
  const alpha = 0.3; // Fixed for greater rigidity
  const padding1 = 3; // Separation between same-color nodes
  const padding2 = 40; // Separation between different-color nodes
  let localNodes: d3.HierarchyCircularNode<unknown>[]; // Use generic unknown
  let maxRadius: number;

  function isLeaf(
    node:
      | d3.QuadtreeInternalNode<d3.HierarchyCircularNode<unknown>>
      | d3.QuadtreeLeaf<d3.HierarchyCircularNode<unknown>>,
  ): node is d3.QuadtreeLeaf<d3.HierarchyCircularNode<unknown>> {
    return "data" in node;
  }

  function force() {
    const quadtree = d3.quadtree(
      localNodes,
      (d) => d.x!,
      (d) => d.y!,
    );

    for (const d of localNodes) {
      const r = d.r + maxRadius;
      const nx1 = d.x! - r,
        ny1 = d.y! - r;
      const nx2 = d.x! + r,
        ny2 = d.y! + r;

      quadtree.visit((q, x1, y1, x2, y2) => {
        if (!q.length) {
          if (isLeaf(q) && q.data !== d) {
            const qNode = q.data as d3.HierarchyCircularNode<any>; // Safe cast
            const dNode = d as d3.HierarchyCircularNode<any>; // Safe cast

            const r =
              dNode.r +
              qNode.r +
              (dNode.data.group === qNode.data.group ? padding1 : padding2);
            let x = dNode.x! - qNode.x!,
              y = dNode.y! - qNode.y!,
              l = Math.hypot(x, y);

            if (l < r) {
              l = ((l - r) / l) * alpha;
              dNode.x! -= x *= l;
              dNode.y! -= y *= l;
              qNode.x! += x;
              qNode.y! += y;
            }
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  force.initialize = (
    _: d3.HierarchyCircularNode<unknown>[],
    random: () => number,
  ) => {
    localNodes = _;
    maxRadius = d3.max(localNodes, (d) => d.r)! + Math.max(padding1, padding2);
  };

  return force;
};

export default FeedbackVis;
