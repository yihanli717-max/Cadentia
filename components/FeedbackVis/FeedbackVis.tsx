import React, { useRef, useEffect, useState } from "react";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import Menu from "@/components/FeedbackVis/Menu";
import {
  cn,
  getColor,
  normalizeAndTransform,
  generateRevision,
} from "@/lib/utils";
import { cosineSimilarity } from "fast-cosine-similarity";
import * as d3 from "d3";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);

  const [
    categoricalDimension,
    numericalDimension,
    hoveredItem,
    setHoveredItem,
    searchedEmeddings,
    similarityThreshold,
    currentSelectedItems,
    currentRevisionItem,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.numericalDimension,
    state.hoveredItem,
    state.setHoveredItem,
    state.searchedEmeddings,
    state.similarityThreshold,
    state.currentSelectedItems,
    state.currentRevisionItem,
  ]);
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
        setDimensions({ width, height: height - 64 });
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
        (item: any) => item[categoricalDimension],
      );

      const data = {
        children: Array.from(groupedFeedback, ([group, children]) => ({
          group,
          children: children.map((item) => ({
            id: item.id,
            group,
            value: item.transformedValues,
            embeddings: item.embeddings,
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
        .attr("fill", (d) => getColor(categoricalDimension)(d.data.group))
        .attr("stroke", getStrokeColor)
        .attr("stroke-width", 5)
        .attr("opacity", getCircleOpacity);

      // Animate circle radius
      fillCircle
        .transition()
        .duration(600)
        .attr("r", (d) => d.r);

      // Attach event listeners
      fillCircle
        .on("click", handleClick)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

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

      return group;
    };

    // Handle click event
    const handleClick = (event: MouseEvent, d: any) => {
      const { revisionList, updateRevision } = useRevisionListStore.getState();
      const currentRevision = revisionList?.find(
        (item) => item.id === currentRevisionItem,
      );

      if (currentRevision?.feedback?.includes(d.data.id)) {
        const newRevisionFeedback = currentRevision.feedback.filter(
          (id) => id !== d.data.id,
        );
        updateRevision({
          id: currentRevisionItem,
          feedback: newRevisionFeedback || [],
          revision: currentRevision?.revision || [],
        });
      } else {
        const { currentSelectedItems, setCurrentSelectedItems } =
          useSharedConfigStore.getState();
        const newSelectedFeedbacks = currentSelectedItems.includes(d.data.id)
          ? currentSelectedItems.filter((id) => id !== d.data.id)
          : [...currentSelectedItems, d.data.id];
        setCurrentSelectedItems(newSelectedFeedbacks);
      }
    };

    // Handle mouse over event
    const handleMouseOver = (event: MouseEvent, d: any) => {
      hoverTimer = setTimeout(() => setHoveredItem(d.data.id), 150);
    };

    // Handle mouse out event
    const handleMouseOut = () => {
      hoverTimer && clearTimeout(hoverTimer);
      setHoveredItem(null);
    };

    // Get stroke color based on selection state
    const getStrokeColor = (d: any) =>
      currentSelectedItems.includes(d.data.id)
        ? "#ffbe00"
        : currentRevision?.feedback?.includes(d.data.id)
          ? "#00a96e"
          : null;

    // Get circle opacity based on selection state
    const getCircleOpacity = (d: any) =>
      currentSelectedItems.includes(d.data.id) ||
      currentRevision?.feedback?.includes(d.data.id)
        ? 1
        : 0.6;

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
          });
        });

      return simulation;
    };

    // Main logic flow
    const nodes = calculateNodes();
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
              .duration(600)
              .attr("fill", getColor(categoricalDimension)(d.data.group))
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
  }, [dimensions, allFeedback, categoricalDimension, numericalDimension]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg
      .selectAll<SVGGElement, d3.HierarchyCircularNode<any>>("g")
      .select(".bar-circle")
      .transition()
      .duration(600)
      .attr("opacity", 0.8)
      .attr("stroke-width", 5)
      .attr("stroke", (d) => (searchedEmeddings ? "#ffffff" : null))
      .attr("stroke-dasharray", (d) =>
        searchedEmeddings
          ? `${2 * Math.PI * d.r * cosineSimilarity(searchedEmeddings, d.data.embeddings)} ${
              2 * Math.PI * d.r
            }`
          : `0 ${2 * Math.PI * d.r}`,
      )
      .attr("r", (d) => d.r - 6);
  }, [searchedEmeddings, categoricalDimension, numericalDimension]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Common cleanup operations
    svg.select("defs").remove();

    // Get all node references
    const fillCircles = svg.selectAll<SVGCircleElement, any>(".fill-circle");
    const barCircles = svg.selectAll<SVGCircleElement, any>(".bar-circle");

    // Generic style reset for all elements
    const resetStyles = () => {
      fillCircles
        .attr("filter", null)
        .attr("opacity", (d) =>
          currentSelectedItems.includes(d.data.id) ||
          currentRevision?.feedback?.includes(d.data.id)
            ? 1
            : 0.6,
        )
        .attr("stroke", (d) =>
          currentSelectedItems.includes(d.data.id)
            ? "#ffbe00"
            : currentRevision?.feedback?.includes(d.data.id)
              ? "#00a96e"
              : null,
        );

      barCircles.attr("filter", null);
    };

    // Handle hover state effects
    const handleHover = () => {
      // Create glow filter for hover effect
      const defs = svg.append("defs");
      defs
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", 3)
        .attr("result", "coloredBlur");

      // Highlight hovered item
      fillCircles
        .filter((d) => d.data.id === hoveredItem)
        .transition()
        .duration(300)
        .attr("stroke", "#e5e6e6")
        .attr("stroke-width", 5)
        .attr("opacity", 1);

      // Cache embeddings data for performance
      const hoveredEmbeddings = allFeedback.find(
        (item) => item.id === hoveredItem,
      )?.embeddings as number[];

      // Reusable similarity effect applicator
      const applySimilarityEffects = (selection: any) => {
        selection
          .attr("opacity", (d: any) =>
            cosineSimilarity(hoveredEmbeddings, d.data.embeddings) >
              similarityThreshold || currentSelectedItems.includes(d.data.id)
              ? 1
              : 0.6,
          )
          .attr("filter", (d: any) =>
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
        .call(applySimilarityEffects);

      barCircles
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .call(applySimilarityEffects);
    };

    // Handle selection state when no hovering
    const handleSelection = () => {
      fillCircles
        .transition()
        .duration(300)
        .attr("stroke", (d) =>
          currentSelectedItems.includes(d.data.id)
            ? "#ffbe00"
            : currentRevision?.feedback?.includes(d.data.id)
              ? "#00a96e"
              : null,
        )
        .attr("stroke-width", 5);
    };

    // Execute main logic flow
    resetStyles();
    hoveredItem ? handleHover() : handleSelection();
  }, [
    hoveredItem,
    similarityThreshold,
    allFeedback,
    currentSelectedItems,
    currentRevision?.feedback,
  ]);

  return (
    <div ref={containerRef} className={cn(props.classes, "relative")}>
      {/* <div className="absolute">{hoveredItem}</div> */}
      <Menu classes="" />
      {dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-pointer absolute bottom-8"
        ></svg>
      )}
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
  const alpha = 0.4; // Fixed for greater rigidity
  const padding1 = 4; // Separation between same-color nodes
  const padding2 = 6; // Separation between different-color nodes
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
