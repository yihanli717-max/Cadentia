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
    setCategoricalDimension,
    numericalDimension,
    setNumericalDimension,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.setCategoricalDimension,
    state.numericalDimension,
    state.setNumericalDimension,
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

  const data = useMemo(() => {
    // Normalize `actionability` and apply `-Math.log`
    const actionabilityValues = allFeedback.map((item) => item.actionability);
    const transformedActionability = normalizeAndTransform(
      actionabilityValues,
      (v) => v,
    );

    // Map the transformed actionability back to feedback items
    const feedbackWithTransformedValues = allFeedback.map((item, index) => ({
      ...item,
      transformedActionability: transformedActionability[index],
    }));

    // Generate data based on the real feedback items
    const groupedFeedback = d3.group(
      feedbackWithTransformedValues,
      (item: any) => item[categoricalDimension],
    );

    return {
      children: Array.from(groupedFeedback, ([group, children]) => ({
        group,
        children: children.map((item) => ({
          group,
          value: item.transformedActionability, // Use transformed value
        })),
      })),
    };
  }, [allFeedback, categoricalDimension]);

  useEffect(() => {
    if (!svgRef.current || !dimensions) return;

    const { width, height } = dimensions;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const pack = d3.pack<any>().size([width, height]).padding(1);

    const nodes = pack(
      d3.hierarchy(data).sum((d) => (d as any).value),
    ).leaves();

    const simulation = d3
      .forceSimulation(nodes)
      .force("x", d3.forceX(width / 2).strength(0.01))
      .force("y", d3.forceY(height / 2).strength(0.01))
      .force("cluster", forceCluster())
      .force("collide", forceCollide());

    const node = svg
      .selectAll<SVGCircleElement, d3.HierarchyCircularNode<any>>("circle")
      .data(nodes)
      .join("circle")
      .attr("cx", (d) => d.x!)
      .attr("cy", (d) => d.y!)
      .attr("fill", (d) => getColor(categoricalDimension)(d.data.group))
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

    node
      .transition()
      .delay((d, i) => Math.random() * 500)
      .duration(750)
      .attrTween("r", (d: any) => {
        const i = d3.interpolate(0, d.r);
        return (t) => (d.r = i(t));
      });

    simulation.on("tick", () => {
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [dimensions, data]);

  return (
    <div ref={containerRef} className={cn(props.classes, "relative")}>
      <Menu classes="absolute top-0 left-0 p-2" />
      {dimensions && (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
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
