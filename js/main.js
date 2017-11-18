/**
 * Created by totor on 2017-11-17.
 */
var width = 960,
    height = 500;

var devicePixelRatio = window.devicePixelRatio || 1;
var network_svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

var network_g = network_svg.append("g").attr("transform", "translate(200,0)");

var transform = d3.zoomIdentity,
    zoom = d3.behavior.zoom().scaleExtent([0.5, 8]).on("zoom", zoomed);

var x = d3.scale.linear().range([0, height]);
var y = d3.scale.linear().range([height, 0]);
var line = d3.svg.line();

var pc_color;
var color_map;

var tooltip;

// ******* graph container ********* //
var nodes, edges;

// ******* parcoords container ********* //
var parcoords = d3.parcoords()("#pc-container");
// this data is used to access POC data as global variable, the usage is find edge in the POC, and sync with network.
var par_data;


$(document).ready(function() {
    init_graph();
    init_parcoords();
});

function init_graph(){

    // d3.json("./data/mooc_keyword_network.json", function(error, graph) {
    d3.json("./data/le_miserable.json", function(error, graph) {

        // ************* 1. graph data parsing ************ //
        // 먼저 edge 데이터 파싱하면서, 해당 source, target node에 attribute 저장
        console.log(graph);

        // communities = _.uniq(_.pluck(_.pluck(graph.edges, "attributes"), "cluster"));
        var temp_color_arr = [];
        nodes = graph.nodes;
        nodes = nodes.map(function(d){
            temp_color_arr.push({"id": d.attributes["Modularity Class"], "color": d.color});
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
        // setting color range for parallel coordinate
        color_map = _.uniq(temp_color_arr, function(d){ return d.id;});


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

        // network_svg.append("g").call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoomed));



        // ******************** draw each edge using path ******************** //
        network_g.append("g")
            .attr("class", "edges")
            .attr("id", "edges")
            .selectAll("line")
            .data(edges)
            .enter().append("path")
            .attr("id", function(d){ return d.source+"-"+d.target;})
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
            .attr("id", function(d) { return d.index; })
            .attr("fill", function(d) { return d.color;})
            // .attr("stroke", function(d) { return d.color;})
            .attr("stroke", "#999")
            .attr("cx", function(d) { return x(d.x); })
            .attr("cy", function(d) { return y(d.y); })
            // .attr("r", function(d) { return Math.log(1+d.size); })
            // .attr("r", function(d) { return Math.sqrt(d.size); })
            .attr("r", function(d) { return d.size/2; })
            .call(d3.behavior.drag()
                .on("drag", dragged))
            .on("mouseover", function(d) {
                mouseover_network(d);
                highlight_parcoords_from_network(d);

            })
            .on("mouseout", function(d) {
                mouseout_network(d);
                unhighlight_parcoords_from_network(d);
            });


        // init tooltip
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("z-index", 1000)
            .style("opacity", 0);

        // // ********** Drag zoom initialize ************* //
        network_svg.call(d3.behavior.zoom().scaleExtent([0.5, 8]).on("zoom", zoomed));
        d3.select("#nodes").attr("cx", 150).attr("cy", 0);

    });
}


function init_parcoords() {

    // load csv file and create the chart
    // d3.csv('./data/mooc_keyword_network.csv', function(error, data) {
    d3.csv('./data/le_miserable.csv', function(error, data) {
        if (error) throw error;

        data = d3.shuffle(data);

        par_data = data;

        // color pallate function
        pc_color = function(d){
            var col;
            color_map.forEach(function(c){
                if (c.id==d.community){ col= c.color; return; }
            });
            return col;
        };

        parcoords
            .data(par_data)
            .width(960)
            .hideAxis(["id", "label"])
            .color(pc_color)
            .alpha(0.6)
            .composite("darken")
            .margin({ top: 60, left: 10, bottom: 12, right: 20 })
            .mode("queue")
            .render()
            .reorderable()
            .brushMode("1D-axes");  // enable brushing

        parcoords.svg.selectAll("text")
            .style("font", "10px sans-serif");

        parcoords.svg.selectAll("text.label")
            .attr("transform", "translate(15,-20) rotate(-20)")


        // get brushed data to active nodes in network
        parcoords.on("brush", function(d) {
            highlight_network_from_parcoords(d);
        });

    });

}

function mouseover_network(d){
    // display tooltip
    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    tooltip.html(d.label)
    // .style("left", (x(findNodePositionX(d.index))) + "px")
    // .style("top", (y(findNodePositionY(d.index))) + "px")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px")
        .style("position", "absolute");


}
function mouseout_network(d){
    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

function highlight_parcoords_from_network(d){
    // select parcoord
    var pc_data = find_pc_data_with_node_id(d)
    parcoords.highlight([pc_data]);
}
function unhighlight_parcoords_from_network(d){
    parcoords.unhighlight();
}

function highlight_network_from_parcoords(data){

    // find node in networks
    d3.select("#nodes").selectAll("circle")
        .attr("fill-opacity", function (d) {
            if(_.findWhere(data, {id: d.index}) !== undefined){
                return 1;
            }else{
                return 0.3;
            }
        });

    d3.select("#edges").selectAll("path")
        .attr("stroke-opacity", function (d) {
            for (var i=0; i<data.length; i++){
                for (var j=i+1; j<data.length-1; j++){
                    if(d.source == data[i].id && d.target == data[j].id)
                        return 0.6;
                }
            }
            return 0.1;
        });
    //
    // find edges which corresponded with activated nodes
    // for (var i=0; i<data.length; i++){
    //     for (var j=0; j<data.length; j++){
    //         var temp = _.findWhere(edges, {source: data[i].id, target:data[j].id});
    //         if(temp !== undefined) toActivate_edges.push(temp);
    //     }
    // }
    // console.log(toActivate_edges);


    // active the edges

    // inactive others

}


function find_pc_data_with_node_id(d){
    var res_data;
    par_data.forEach(function (data) {
        if(d.index == data.id){
            res_data = data;
            return;
        }
    });
    return res_data;
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
    // network_g.select("g.nodes").attr("transform", d3.event.transform);
    // network_g.select("g.edges").attr("transform", d3.event.transform);
    d3.select("div.tooltip").attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
    network_svg.selectAll("g").attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")

}

function dragged(d){
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

