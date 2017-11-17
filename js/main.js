/**
 * Created by totor on 2017-11-17.
 */

var width = 960,
    height = 500;

var network_svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
var network_g = network_svg.append("g");

var transform = d3.zoomIdentity,
    zoom = d3.zoom().scaleExtent([0.5, 8]).on("zoom", zoomed);

var x = d3.scaleLinear().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

var line = d3.line();

var tooltip;

// ******* graph container ********* //
var nodes, edges;


$(document).ready(function(){
    init_graph();
});



function init_graph(){

    d3.json("./data/mooc_keyword_network.json", function(error, graph) {

        // ************* 1. graph data parsing ************ //
        // 먼저 edge 데이터 파싱하면서, 해당 source, target node에 attribute 저장
        console.log(graph);

        // communities = _.uniq(_.pluck(_.pluck(graph.edges, "attributes"), "cluster"));
        nodes = graph.nodes;
        nodes = nodes.map(function(d){
            return {
                // node info
                'index': d.id,
                'x': d.x,
                'y': d.y,
                'color': d.color,
                'label': d.label,
                'size': d.size,
                'community': d.attributes["Modularity Class"]
            }

        });
        console.log(nodes);

        // ******************* x, y range and domain setting ****************** //
        var x0 = d3.extent(nodes, function(d){ return d.x;});
        var y0 = d3.extent(nodes, function(d){ return d.y;})
        x.domain(x0);
        y.domain(y0);

        // ******************* link parsing ********************************** //
        edges = graph.edges.map(function(d){

            return {
                'source': d.source,
                'target': d.target,
                'size': d.size,
                'color': d.color
            }
        });
        console.log(edges);



        // ******************** draw each edge using path ******************** //
        network_g.append("g")
            .attr("class", "edges")
            .attr("id", "edges")
            .selectAll("line")
            .data(edges)
            .enter().append("path")
            .attr("class", "line")
            .attr("stroke-width", function(d) { return Math.sqrt(d.size); })
            .attr("stroke", function(d) { return d.color; })
            .attr("stroke-opacity", 0.6)
            .attr("d", function(d) { return line( [
                [x(findNodePositionX(d.source)), y(findNodePositionY(d.source))],
                [x(findNodePositionX(d.target)), y(findNodePositionY(d.target))]
            ])});


        // ******************** draw node ******************** //
        network_g.append("g")
            .attr("class", "nodes")
            .attr("id", "nodes")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("fill", function(d) { return d.color;})
            // .attr("fill-opacity", getNodeOpacity)
            .attr("cx", function(d) { return x(d.x); })
            .attr("cy", function(d) { return y(d.y); })
            // .attr("r", function(d) { return Math.log(1+d.size); })
            .attr("r", function(d) { return Math.sqrt(d.size); })
            .call(d3.drag()
                .on("drag", dragged))
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(d.label)
                    // .style("left", (x(findNodePositionX(d.index))) + "px")
                    // .style("top", (y(findNodePositionY(d.index))) + "px")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
                    .style("position", "absolute");

            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });


        // init tooltip
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("z-index", 1000)
            .style("opacity", 0);

        // ********** Drag zoom initialize ************* //
        network_svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity.translate(width/6, height/10).scale(0.7));

    });
}


function findNodePositionX(id){
    var temp_x = _.where(nodes, {index: id});
    return temp_x[0].x;
}
function findNodePositionY(id){
    var temp_y = _.where(nodes, {index: id});
    return temp_y[0].y;
}

function findNodeById(id){
    var temp_node = _.where(nodes, {index: id});
    return temp_node;
}


function zoomed(){
    network_g.select("g.nodes").attr("transform", d3.event.transform);
    network_g.select("g.edges").attr("transform", d3.event.transform);
    d3.select("div.tooltip").attr("transform", d3.event.transform);
}

function dragged(d){
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

