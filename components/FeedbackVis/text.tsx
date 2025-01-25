import React, { useRef, useEffect, useState } from "react";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";
import Menu from "@/components/FeedbackVis/Menu";
import { cn, getColor, normalizeAndTransform } from "@/lib/utils";
import { cosineSimilarity } from "fast-cosine-similarity";
import * as d3 from "d3";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  const [isApplied, setIsApplied] = useState(false);
  const allFeedback = useFeedbackStore((state) => state.feedback);

  const [
    categoricalDimension,
    numericalDimension,
    hoveredItem,
    setHoveredItem,
    searchedEmeddings,
    similarityThreshold,
    currentSelectedItems,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.numericalDimension,
    state.hoveredItem,
    state.setHoveredItem,
    state.searchedEmeddings,
    state.similarityThreshold,
    state.currentSelectedItems,
  ]);

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
    if (!svgRef.current || !dimensions) return;

    const { width, height } = dimensions;

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

      console.log(data);

      const pack = d3.pack<any>().size([width, height]).padding(1);
      return pack(d3.hierarchy(data).sum((d) => (d as any).value)).leaves();
    };

    // Create or update nodes
    const nodes = calculateNodes();

    const svg = d3.select(svgRef.current);

    const createSimulation = (
      nodeGroup: d3.HierarchyCircularNode<any>[],
      nodeElement: d3.Selection<
        SVGGElement,
        d3.HierarchyCircularNode<any>,
        SVGSVGElement,
        unknown
      >,
      targetX: number,
    ) => {
      // Create simulation
      const simulation = d3
        .forceSimulation(nodeGroup)
        .force("x", d3.forceX(targetX).strength(0.01))
        .force("y", d3.forceY(height / 2).strength(0.01))
        .force("cluster", forceCluster())
        .force("collide", forceCollide());

      simulation.on("tick", () => {
        nodeElement.each(function () {
          const group = d3.select(this);

          // Update fill-circle position
          group
            .select(".fill-circle")
            .attr("cx", (d: any) => {
              d.x = Math.max(d.r, Math.min(width - d.r, d.x));
              return d.x;
            })
            .attr("cy", (d: any) => {
              d.y = Math.max(d.r, Math.min(height - d.r, d.y));
              return d.y;
            });

          // Update bar-circle position
          group
            .select(".bar-circle")
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y);

          // Update ring-circle position
          group
            .select(".ring-circle")
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y);
        });
      });

      return simulation;
    };

    const createNodeElement = (nodeGroup: d3.HierarchyCircularNode<any>[]) => {
      let hoverTimer: NodeJS.Timeout | null = null;

      const nodeElement = svg
        .selectAll<SVGGElement, d3.HierarchyCircularNode<any>>("g")
        .data(nodeGroup, (d: any) => d.data.id) // Use id as key
        .join(
          (enter) => {
            const group = enter.append("g"); // Create a group for each nodeElement

            // Circle for the ring
            group
              .append("circle")
              .attr("class", "ring-circle")
              .attr("cx", (d) => d.x!)
              .attr("cy", (d) => d.y!)
              .attr("r", (d) => d.r + 3)
              .attr("fill", "none")
              .attr("stroke", "none");

            // Circle for the fill
            group
              .append("circle")
              .attr("class", "fill-circle")
              .attr("cx", (d) => d.x!)
              .attr("cy", (d) => d.y!)
              .attr("r", 0)
              .attr("fill", (d) => getColor(categoricalDimension)(d.data.group))
              .attr("stroke", null)
              .attr("stroke-width", 0)
              .attr("opacity", (d) => 0.6)
              .call((enter) =>
                enter
                  .transition()
                  .duration(600)
                  .attr("r", (d) => d.r),
              )
              .call((enter) =>
                enter
                  .transition()
                  .duration(600)
                  .attr("r", (d) => d.r),
              )
              .on("click", function (event, d) {
                const { currentSelectedItems, setCurrentSelectedItems } =
                  useSharedConfigStore.getState();

                const newSelectedFeedbacks = currentSelectedItems.includes(
                  d.data.id,
                )
                  ? currentSelectedItems.filter((id) => id !== d.data.id)
                  : [...currentSelectedItems, d.data.id];

                setCurrentSelectedItems(newSelectedFeedbacks);

                // console.log(newSelectedFeedbacks);
              })
              .on("mouseover", function (event, d) {
                hoverTimer = setTimeout(() => {
                  // console.log(d.data.id);
                  setHoveredItem(d.data.id); // Set hovered item id
                }, 150);
              })
              .on("mouseout", function () {
                if (hoverTimer) {
                  clearTimeout(hoverTimer);
                  hoverTimer = null;
                }
                setHoveredItem(null); // Optionally, reset hoveredItem on mouseout
              });

            // Circle for the bar
            group
              .append("circle")
              .attr("class", "bar-circle")
              .attr("cx", (d) => d.x!)
              .attr("cy", (d) => d.y!)
              .attr("r", (d) => d.r - 6)
              .attr("fill", "none")
              .attr("stroke-dasharray", (d) => `0 ${2 * Math.PI * d.r}`)
              .attr("stroke-linecap", "round");

            return group;
          },
          (update) =>
            update.each(function (d) {
              const group = d3.select(this);

              // Update fill circle
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

      return nodeElement;
    };

    const nodeElement = createNodeElement(nodes);
    const simulation = createSimulation(nodes, nodeElement, width / 2);

    // Apply drag behavior only to fill circles
    nodeElement
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
      .attr("stroke-width", 4)
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

    svg.select("defs").remove();

    // Reset all nodes to default
    svg
      .selectAll<SVGCircleElement, any>(".fill-circle")
      .attr("filter", null)
      .attr("opacity", (d) =>
        currentSelectedItems.includes(d.data.id) ? 1 : 0.6,
      );
    svg.selectAll<SVGCircleElement, any>(".fill-circle").attr("stroke", null);
    svg.selectAll<SVGCircleElement, any>(".bar-circle").attr("filter", null);
    svg.selectAll<SVGCircleElement, any>(".ring-circle").attr("filter", null);

    // Highlight the hovered item if present
    if (hoveredItem) {
      const defs = svg.append("defs");
      defs
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", 3)
        .attr("result", "coloredBlur");

      svg
        .selectAll<SVGCircleElement, any>(".fill-circle")
        .filter((d) => d.data.id === hoveredItem)
        .transition()
        .duration(300)
        // .attr("filter", "url(#glow)")
        .attr("stroke", "#93c5fd")
        .attr("stroke-width", 3)
        .attr("opacity", 1);

      svg
        .selectAll<SVGCircleElement, any>(".fill-circle")
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .attr("opacity", (d) =>
          cosineSimilarity(
            allFeedback.find((item) => item.id === hoveredItem)!
              .embeddings as number[],
            d.data.embeddings,
          ) > similarityThreshold || currentSelectedItems.includes(d.data.id)
            ? 1
            : 0.6,
        )
        .attr("filter", (d) =>
          cosineSimilarity(
            allFeedback.find((item) => item.id === hoveredItem)!
              .embeddings as number[],
            d.data.embeddings,
          ) < similarityThreshold
            ? "url(#glow)"
            : null,
        );

      svg
        .selectAll<SVGCircleElement, any>(".bar-circle")
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .attr("filter", (d) =>
          cosineSimilarity(
            allFeedback.find((item) => item.id === hoveredItem)!
              .embeddings as number[],
            d.data.embeddings,
          ) < similarityThreshold
            ? "url(#glow)"
            : null,
        );

      svg
        .selectAll<SVGCircleElement, any>(".ring-circle")
        .filter((d) => d.data.id !== hoveredItem)
        .transition()
        .duration(300)
        .attr("filter", (d) =>
          cosineSimilarity(
            allFeedback.find((item) => item.id === hoveredItem)!
              .embeddings as number[],
            d.data.embeddings,
          ) < similarityThreshold
            ? "url(#glow)"
            : null,
        );
    }
  }, [
    hoveredItem,
    similarityThreshold,
    allFeedback,
    currentSelectedItems,
    categoricalDimension,
    numericalDimension,
  ]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Reset all nodes to remove stroke
    svg.selectAll<SVGCircleElement, any>(".fill-circle").attr("opacity", 0.6);
    svg.selectAll<SVGCircleElement, any>(".ring-circle").attr("stroke", null);

    // Highlight selected feedbacks
    if (currentSelectedItems.length > 0) {
      svg
        .selectAll<SVGCircleElement, any>(".fill-circle")
        .transition()
        .duration(300)
        .attr("opacity", (d) =>
          currentSelectedItems.includes(d.data.id) ? 1 : 0.6,
        );

      svg
        .selectAll<SVGCircleElement, any>(".ring-circle")
        .transition()
        .duration(300)
        .attr("stroke", (d) =>
          currentSelectedItems.includes(d.data.id) ? "#ff00d3" : null,
        )
        .attr("stroke-width", 3);
    }
  }, [currentSelectedItems, categoricalDimension, numericalDimension]);

  return (
    <div ref={containerRef} className={cn(props.classes, "relative")}>
      {/* <div className="absolute">{hoveredItem}</div> */}
      <Menu classes="" />
      {dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-pointer absolute bottom-6"
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
  const padding1 = 8; // Separation between same-color nodes
  const padding2 = 10; // Separation between different-color nodes
  let localNodes: d3.HierarchyCircularNode<unknown>[]; // Use generic unknown
  let maxRadius: number;

  function isLeaf(
    nodeElement:
      | d3.QuadtreeInternalNode<d3.HierarchyCircularNode<unknown>>
      | d3.QuadtreeLeaf<d3.HierarchyCircularNode<unknown>>,
  ): nodeElement is d3.QuadtreeLeaf<d3.HierarchyCircularNode<unknown>> {
    return "data" in nodeElement;
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
