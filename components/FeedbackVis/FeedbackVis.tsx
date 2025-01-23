import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";
import { FeedbackItem } from "@/lib/type";
import Menu from "@/components/FeedbackVis/Menu";
import { cn, getColor, normalizeAndTransform } from "@/lib/utils";
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
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.numericalDimension,
    state.hoveredItem,
    state.setHoveredItem,
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
        setDimensions({ width, height });
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
          })),
        })),
      };

      const pack = d3.pack<any>().size([width, height]).padding(1);
      return pack(d3.hierarchy(data).sum((d) => (d as any).value)).leaves();
    };

    // Create or update nodes
    let nodes = calculateNodes();

    const svg = d3.select(svgRef.current);

    let hoverTimer: NodeJS.Timeout | null = null;

    const node = svg
      .selectAll<SVGCircleElement, d3.HierarchyCircularNode<any>>("circle")
      .data(nodes, (d: any) => d.data.id) // Use id as key
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("cx", (d) => d.x!)
            .attr("cy", (d) => d.y!)
            .attr("r", 0) // Start with radius 0
            .attr("fill", (d) => getColor(categoricalDimension)(d.data.group))
            .attr("stroke", (d) => (d.data.id === hoveredItem ? "gray" : null))
            .attr("opacity", 0.6)
            .call((enter) =>
              enter
                .transition()
                .duration(750)
                .attr("r", (d) => d.r),
            )
            .on("mouseover", function (event, d) {
              hoverTimer = setTimeout(() => {
                console.log(d.data.id);
                setHoveredItem(d.data.id); // Set hovered item id
              }, 150);
            })
            .on("mouseout", function () {
              if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
              }
              setHoveredItem(null); // Optionally, reset hoveredItem on mouseout
            }),
        (update) =>
          update.call(
            (update) =>
              update
                .transition()
                .duration(750)
                .attr("fill", (d) =>
                  getColor(categoricalDimension)(d.data.group),
                ) // Update color
                .attr("r", (d) => d.r), // Update radius
          ),
        (exit) =>
          exit.call((exit) =>
            exit.transition().duration(500).attr("r", 0).remove(),
          ),
      );

    node.call(
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

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force("x", d3.forceX(width / 2).strength(0.01))
      .force("y", d3.forceY(height / 2).strength(0.01))
      .force("cluster", forceCluster())
      .force("collide", forceCollide());

    simulation.on("tick", () => {
      node
        .attr("cx", (d) => {
          d.x = Math.max(d.r, Math.min(width - d.r, d.x));
          return d.x;
        })
        .attr("cy", (d) => {
          d.y = Math.max(d.r, Math.min(height - d.r, d.y));
          return d.y;
        });
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [dimensions, allFeedback, categoricalDimension, numericalDimension]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Reset all nodes to remove stroke
    svg
      .selectAll<SVGCircleElement, any>("circle")
      // .attr("filter", null)
      .attr("opacity", 0.6)
      .attr("stroke", null)
      .attr("stroke-width", 0);

    const defs = svg.append("defs");
    defs
      .append("filter")
      .attr("id", "glow")
      .append("feGaussianBlur")
      .attr("stdDeviation", 3)
      .attr("result", "coloredBlur");

    // Highlight the hovered item if present
    if (hoveredItem) {
      svg
        .selectAll<SVGCircleElement, any>("circle")
        .filter((d) => d.data.id === hoveredItem)
        // .attr("filter", "url(#glow)")
        .attr("opacity", 1)
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 2);
    }
  }, [hoveredItem]);

  return (
    <div ref={containerRef} className={cn(props.classes, "relative")}>
      {/* <div className="absolute">{hoveredItem}</div> */}
      <Menu classes="absolute top-0 left-0 p-2" />
      {dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-pointer"
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
  const padding1 = 2; // Separation between same-color nodes
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
