/**
 * Created by totor on 2017-11-17.
 */

var margin = {top: 66, right: 110, bottom: 20, left: 188},
    pc_width = 960 - margin.left - margin.right,
    pc_height = 300 - margin.top - margin.bottom,
    pc_innerHeight = pc_height - 2;

var types = {
    "Number": {
        key: "Number",
        coerce: function(d) { return +d; },
        extent: d3.extent,
        within: function(d, extent, dim) { return extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1]; },
        defaultScale: d3.scaleLinear().range([pc_innerHeight, 0])
    },
    "String": {
        key: "String",
        coerce: String,
        extent: function (data) { return data.sort(); },
        within: function(d, extent, dim) { return extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1]; },
        defaultScale: d3.scalePoint().range([0, pc_innerHeight])
    },
    "Date": {
        key: "Date",
        coerce: function(d) { return new Date(d); },
        extent: d3.extent,
        within: function(d, extent, dim) { return extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1]; },
        defaultScale: d3.scaleTime().range([0, pc_innerHeight])
    }
};

var dimensions = [
    {
        key: "modularity_class",
        description: "Network community",
        type: types["String"],
        axis: d3.axisLeft()
            .tickFormat(function(d,i) {
                return d;
            })
    },
    // {
    //     key: "id",
    //     type: types["String"],
    //
    // },
    // {
    //     key: "label",
    //     type: types["String"],
    //
    // },
    {
        key: "eccentricity",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "closness_centrality",
        description: "Closness centrality",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "harmonic_closness_centrality",
        description: "Harmonic closness centrality",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "betweeness_centrality",
        description: "Betweeness centrality",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "eigen_centrality",
        description: "Eigenvector centrality",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "pageranks",
        description: "Pageranks",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "clustering_coefficient",
        dsecription: "Clustering coefficient",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    },
    {
        key: "triangles",
        description: "Triangles",
        type: types["Number"],
        scale: d3.scaleSqrt().range([pc_innerHeight, 0])
    }
];


var xscale = d3.scalePoint()
    .domain(d3.range(dimensions.length))
    .range([0, pc_width]);

var yAxis = d3.axisLeft();

var pc_container = d3.select("#pc-container").append("div")
    .attr("class", "parcoords")
    .style("width", pc_width + margin.left + margin.right + "px")
    .style("height", pc_height + margin.top + margin.bottom + "px");

var pc_svg = pc_container.append("svg")
    .attr("width", pc_width + margin.left + margin.right)
    .attr("height", pc_height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var canvas = pc_container.append("canvas")
    .attr("width", pc_width * devicePixelRatio)
    .attr("height", pc_height * devicePixelRatio)
    .style("width", pc_width + "px")
    .style("height", pc_height + "px")
    .style("margin-top", margin.top + "px")
    .style("margin-left", margin.left + "px");

var ctx = canvas.node().getContext("2d");
ctx.globalCompositeOperation = 'darken';
ctx.globalAlpha = 0.15;
ctx.lineWidth = 1.5;
ctx.scale(devicePixelRatio, devicePixelRatio);


var axes = pc_svg.selectAll(".axis")
    .data(dimensions)
    .enter().append("g")
    .attr("class", function(d) { return "axis " + d.key.replace(/ /g, "_"); })
    .attr("transform", function(d,i) { return "translate(" + xscale(i) + ")"; });

var pc_color = d3.scaleOrdinal()
    .range(["rgb(232,59,66)", "rgb(175,111,0)", "rgb(0,147,96)", "rgb(141,110,225)",
        "rgb(0,128,192)", "rgb(192,192,192)", "rgb(0,158,198)", "rgb(214,66,157)", "rgb(70,145,0)"]);



function init_parcoordsssss(){

    // load csv file and create the chart
    d3.csv('./data/mooc_keyword_network.csv', function(error, data) {
        if (error) throw error;

        // shuffle data
        data = d3.shuffle(data);
        // sort by community
        // data = _.sortBy(data, function(d) { return Number(d.modularity_class); })

        data.forEach(function(d) {
            dimensions.forEach(function(p) {

                d[p.key] = !d[p.key] ? null : p.type.coerce(d[p.key]);
            });

            // truncate long text strings to fit in data table
            for (var key in d) {
                if (d[key] && d[key].length > 35) d[key] = d[key].slice(0,36);
            }
        });
        console.log(data);
        console.log(dimensions);

        // type/dimension default setting happens here
        dimensions.forEach(function(dim) {
            if (!("domain" in dim)) {
                // detect domain using dimension type's extent function
                dim.domain = d3_functor(dim.type.extent)(data.map(function(d) { return d[dim.key]; }));
            }
            if (!("scale" in dim)) {
                // use type's default scale for dimension
                dim.scale = dim.type.defaultScale.copy();
            }
            dim.scale.domain(dim.domain);
        });

        var render = renderQueue(draw).rate(50);

        ctx.clearRect(0,0,pc_width,pc_height);
        ctx.globalAlpha = d3.min([0.85/Math.pow(data.length,0.3),1]);
        render(data);

        axes.append("g")
            .each(function(d) {
                var renderAxis = "axis" in d
                    ? d.axis.scale(d.scale)  // custom axis
                    : yAxis.scale(d.scale);  // default axis
                d3.select(this).call(renderAxis);
            })
            .append("text")
            .attr("class", "title")
            .attr("text-anchor", "start")
            .text(function(d) { return "description" in d ? d.description : d.key; });

        // Add and store a brush for each axis.
        axes.append("g")
            .attr("class", "brush")
            .each(function(d) {
                d3.select(this).call(d.brush = d3.brushY()
                    .extent([[-10,0], [10,pc_height]])
                    .on("start", brushstart)
                    .on("brush", brush)
                    .on("end", brush)
                )
            })
            .selectAll("rect")
            .attr("x", -8)
            .attr("width", 16);

        d3.selectAll(".axis.modularity_class .tick text")
            .style("fill", pc_color);

        // output.text(d3.tsvFormat(data.slice(0,24)));

        function project(d) {
            return dimensions.map(function(p,i) {
                // check if data element has property and contains a value
                if (
                    !(p.key in d) ||
                    d[p.key] === null
                ) return null;

                return [xscale(i),p.scale(d[p.key])];
            });
        };

        function draw(d) {
            ctx.strokeStyle = pc_color(d.modularity_class);
            ctx.beginPath();
            var coords = project(d);
            coords.forEach(function(p,i) {
                // this tricky bit avoids rendering null values as 0
                if (p === null) {
                    // this bit renders horizontal lines on the previous/next
                    // dimensions, so that sandwiched null values are visible
                    if (i > 0) {
                        var prev = coords[i-1];
                        if (prev !== null) {
                            ctx.moveTo(prev[0],prev[1]);
                            ctx.lineTo(prev[0]+6,prev[1]);
                        }
                    }
                    if (i < coords.length-1) {
                        var next = coords[i+1];
                        if (next !== null) {
                            ctx.moveTo(next[0]-6,next[1]);
                        }
                    }
                    return;
                }

                if (i == 0) {
                    ctx.moveTo(p[0],p[1]);
                    return;
                }

                ctx.lineTo(p[0],p[1]);
            });
            ctx.stroke();
        }

        function brushstart() {
            d3.event.sourceEvent.stopPropagation();
        }

        // Handles a brush event, toggling the display of foreground lines.
        function brush() {
            render.invalidate();

            var actives = [];
            pc_svg.selectAll(".axis .brush")
                .filter(function(d) {
                    return d3.brushSelection(this);
                })
                .each(function(d) {
                    actives.push({
                        dimension: d,
                        extent: d3.brushSelection(this)
                    });

                });



            var selected = data.filter(function(d) {
                if (actives.every(function(active) {
                        var dim = active.dimension;
                        // test if point is within extents for each active brush
                        return dim.type.within(d[dim.key], active.extent, dim);
                    })) {
                    return true;
                }
            });

            // selected가 활성화된 line임.
            console.log(selected)

            // show ticks for active brush dimensions
            // and filter ticks to only those within brush extents
            /*
             pc_svg.selectAll(".axis")
             .filter(function(d) {
             return actives.indexOf(d) > -1 ? true : false;
             })
             .classed("active", true)
             .each(function(dimension, i) {
             var extent = extents[i];
             d3.select(this)
             .selectAll(".tick text")
             .style("display", function(d) {
             var value = dimension.type.coerce(d);
             return dimension.type.within(value, extent, dimension) ? null : "none";
             });
             });

             // reset dimensions without active brushes
             pc_svg.selectAll(".axis")
             .filter(function(d) {
             return actives.indexOf(d) > -1 ? false : true;
             })
             .classed("active", false)
             .selectAll(".tick text")
             .style("display", null);
             */

            ctx.clearRect(0,0,pc_width,pc_height);
            ctx.globalAlpha = d3.min([0.85/Math.pow(selected.length,0.3),1]);
            render(selected);

            // output.text(d3.tsvFormat(selected.slice(0,24)));
        }
    });

}






function d3_functor(v) {
    return typeof v === "function" ? v : function() { return v; };
};
