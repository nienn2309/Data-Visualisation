const width = 950;
const height = 650;
const svg = d3.select("body").append("svg").on("click", reset);
const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);
svg.call(zoom);
svg
  .attr("viewBox", [0, 0, width, height])
  .attr("width", width)
  .attr("height", height)
  .attr("style", "max-width: 100%; height: auto;");

const map = svg.append("g").attr("class", "map").on("click", reset);
const tooltip = d3.select("#tooltip");
let pathcanada;
let pathworld;

const color = d3
  .scaleQuantize()
  .range(["#FFEBEE", "#FF5252", "#FF1744", "#880E4F"]);

const projection = d3
  .geoMercator()
  .scale(150)
  .translate([width / 2, height / 1.5]);
const path = d3.geoPath().projection(projection);

let countryData;

d3.queue()
  .defer(d3.json, "src/data/countries.json")
  .defer(d3.json, "src/data/canada.geojson")
  .defer(d3.json, "src/data/countriestoQuebec.json")
  .await(function (error, world, canada, data) {
    if (error) {
      console.error("Oh dear, something went wrong: " + error);
    } else {
      countryData = data;
      drawMap(world.features, canada.features, countryData);
    }
  });

function updateCountryInfo(country) {
  svg.selectAll(".country-info").remove();
  const infoGroup = svg.append("g").attr("class", "country-info");
  const countryInfo = countryData.find(function (c) {
    return c.Country === country.properties.name;
  });

  if (countryInfo) {
    infoGroup
      .append("rect")
      .attr("x", width - width / 3)
      .attr("y", 0)
      .attr("width", width / 3)
      .attr("height", height)
      .attr("fill", "rgba(255, 255, 255, 0.8)");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 20)
      .text("Country Information")
      .attr("font-size", "18px")
      .attr("font-weight", "bold");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 50)
      .text("Name: " + country.properties.name)
      .attr("font-size", "14px");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 80)
      .text("Total: " + countryInfo.Total)
      .attr("font-size", "14px");

    const barWidth = 60;
    const barHeight = 200;
    const barX = width - width / 3 + 40;
    const barY = 120;
    const data = [
      { label: "Economic Immigrants", value: countryInfo.Economic_Immigrants },
      {
        label: "Family Reunification",
        value: countryInfo.Family_Reunification,
      },
      { label: "Refugees or Similar", value: countryInfo.Refugees_or_Similar },
      { label: "Other Immigrants", value: countryInfo.Other_Immigrants },
    ];

    const xScale = d3
      .scaleBand()
      .domain(data.map((d, i) => i))
      .range([barX, barX + barWidth * data.length])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)])
      .range([barY + barHeight, barY])
      .nice();

    infoGroup
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(i) + 10)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => barY - yScale(d.value) + barHeight)
      .attr("fill", "steelblue");

    infoGroup
      .selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d, i) => xScale(i) + xScale.bandwidth() / 2 + 10)
      .attr("y", (d) => yScale(d.value) - 5)
      .text((d) => d.value)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "black");

    const xAxisGroup = infoGroup
      .append("g")
      .attr("transform", "translate(10," + (barY + barHeight) + ")")
      .call(d3.axisBottom(xScale));

    xAxisGroup
      .selectAll("text")
      .text(function (d, i) {
        return ["Economic", "Family", "Refugees", "Others"][i];
      })
      .attr("font-size", "12px")
      .attr("fill", "black")
      .attr("y", "12");

    xAxisGroup.selectAll("line").attr("y2", "10");

    const yAxisGroup = infoGroup
      .append("g")
      .attr("transform", "translate(" + (barX + 10) + ",0)")
      .call(d3.axisLeft(yScale));

    yAxisGroup
      .selectAll("text")
      .attr("font-size", "12px")
      .attr("fill", "black");

    yAxisGroup.selectAll("line").attr("x2", -5);
  } else {
    infoGroup
      .append("rect")
      .attr("x", width - width / 3)
      .attr("y", 0)
      .attr("width", width / 3)
      .attr("height", height)
      .attr("fill", "rgba(255, 255, 255, 0.8)");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 20)
      .text("Country Information")
      .attr("font-size", "18px")
      .attr("font-weight", "bold");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 50)
      .text("Name: " + country.properties.name)
      .attr("font-size", "14px");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", 80)
      .text("No information")
      .attr("font-size", "14px");
  }
}

function drawMap(worldFeatures, canadaFeatures, countryData) {
  const quebecCoords = [-73.5491, 52.9399];
  const lines = [];

  const maxEconomicImmigrants = d3.max(countryData, function (d) {
    return d.Total;
  });

  color.domain([0, maxEconomicImmigrants]);

  countryData.forEach(function (d) {
    const startCoords = d.Coordinates;
    const endCoords = quebecCoords;
    const lineString = {
      type: "LineString",
      coordinates: [startCoords, endCoords],
      immigrants: d.Total,
    };
    lines.push(lineString);
  });

  pathworld = map
    .selectAll("path.world")
    .data(worldFeatures)
    .enter()
    .append("path")
    .attr("class", "world")
    .attr("name", function (d) {
      return d.properties.name;
    })
    .attr("id", function (d) {
      return d.id;
    })
    .attr("d", path)
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut)
    .on("click", clicked)
    .style("fill", function (d) {
      const country = countryData.find(function (c) {
        return c.Country === d.properties.name;
      });
      return country ? color(country.Total) : "#90EE90";
    });

  pathcanada = map
    .selectAll("path.canada")
    .data(canadaFeatures)
    .enter()
    .append("path")
    .attr("class", "canada")
    .attr("name", function (d) {
      return d.properties.name;
    })
    .attr("id", function (d) {
      return d.id;
    })
    .attr("d", path)
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut)
    .on("click", clicked)
    .style("fill", function (d) {
      return d.properties.name === "Quebec" ? "#D2691E" : null;
    });
  // .style("stroke", function (d) {
  //   return d.properties.name === "Quebec" ? "black" : null;
  // })
  // .style("stroke-width", function (d) {
  //   return d.properties.name === "Quebec" ? 0.5 : null;
  // });

  map
    .selectAll("path.line")
    .data(lines)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("d", path)
    .style("fill", "none")
    .style("stroke", "orange")
    .style("stroke-width", "1.5");

  map
    .selectAll("circle")
    .data(countryData)
    .enter()
    .append("circle")
    .attr("class", "start-circle")
    .attr("cx", function (d) {
      return projection(d.Coordinates)[0];
    })
    .attr("cy", function (d) {
      return projection(d.Coordinates)[1];
    })
    .attr("r", 2)
    .style("fill", "orange");

  map
    .append("circle")
    .attr("class", "quebec-circle")
    .attr("cx", projection(quebecCoords)[0])
    .attr("cy", projection(quebecCoords)[1])
    .attr("r", 8)
    .style("fill", "orange");

  const legendData = [
    { color: "#FFEBEE", value: 0, label: "0 - 10000" },
    { color: "#FF5252", value: 10000, label: "10000 - 20000" },
    { color: "#FF1744", value: 20000, label: "20000 - 30000" },
    { color: "#880E4F", value: 30000, label: "30000 +" },
  ];

  const legendHeight = 120;
  const legendWidth = 100;
  const legendX = 10;
  const legendY = height - legendHeight - 10;

  const legendGroup = svg.append("g").attr("class", "legend");

  legendGroup
    .selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("class", "legend-item")
    .attr("x", legendX)
    .attr("y", (d, i) => legendY + i * (legendHeight / legendData.length))
    .attr("width", legendWidth)
    .attr("height", legendHeight / legendData.length)
    .attr("fill", (d) => d.color);

  legendGroup
    .selectAll(".legend-text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("class", "legend-text")
    .attr("x", legendX + legendWidth / 2)
    .attr(
      "y",
      (d, i) =>
        legendY +
        i * (legendHeight / legendData.length) +
        legendHeight / legendData.length / 2
    )
    .attr("dy", "0.35em")
    .text((d) => d.label)
    .attr("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-weight", "bold")
    .style("pointer-events", "none");
}

function handleMouseOver(d) {
  d3.select(this)
    .style("stroke", "white")
    .style("stroke-width", 1)
    .style("cursor", "pointer");

  tooltip
    .style("display", "block")
    .html(d.properties.name)
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY - 28 + "px");
}

function handleMouseOut(d) {
  d3.select(this).style("stroke", null).style("stroke-width", 0.25);

  tooltip.style("display", "none");
}

function zoomed() {
  map.attr("transform", d3.event.transform);
}

function clicked(d) {
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  d3.event.stopPropagation();
  pathcanada.transition().style("fill", function (d) {
    return d.properties.name === "Quebec" ? "#D2691E" : null;
  });
  pathworld.transition().style("fill", function (d) {
    const country = countryData.find(function (c) {
      return c.Country === d.properties.name;
    });
    return country ? color(country.Total) : "#90EE90";
  });
  d3.select(this).transition().style("fill", "red");
  svg
    .transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(
          Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height))
        )
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
    );

  updateCountryInfo(d);
}

function reset() {
  pathcanada.transition().style("fill", function (d) {
    return d.properties.name === "Quebec" ? "#D2691E" : null;
  });
  pathworld.transition().style("fill", function (d) {
    const country = countryData.find(function (c) {
      return c.Country === d.properties.name;
    });
    return country ? color(country.Total) : "#90EE90";
  });
  svg
    .transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity,
      d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
  svg.selectAll(".country-info").remove();
}
