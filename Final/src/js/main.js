const width = 950;
const height = 650;
const svg = d3.select(".svg-container").append("svg").on("click", reset);
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

const provincename = localStorage.getItem("name");
console.log(provincename);

const linkdata = localStorage.getItem("linkdata");
let dataFile;
if (linkdata) {
  dataFile = JSON.parse(linkdata);
}

d3.queue()
  .defer(d3.json, "src/data/countries.json")
  .defer(d3.json, "src/data/canada.geojson")
  .defer(d3.json, dataFile)
  .await(function (error, world, canada, data) {
    if (error) {
      console.error("Oh dear, something went wrong: " + error);
    } else {
      countryData = data;
      canadaProvince = canada;
      drawMap(world.features, canada.features, countryData);
    }
  });
function showProvinceTooltip(d, x, y) {
  const percentage =
    (d.value / d3.sum(d3.selectAll(".arc").data(), (v) => v.value)) * 100;
  tooltip
    .style("display", "block")
    .html(function () {
      return `<div class="tooltip-header">Quebec Province Immigration Data</div>
                 <div class="tooltip-row"><span class="tooltip-label">${
                   d.data.Country
                 }:</span> <span class="tooltip-value">${percentage.toFixed(2)}%</span></div>`;
    })
    .style("left", x + "px")
    .style("top", y - 50 + "px");
}

function updateCountryInfo(country) {
  svg.selectAll(".country-info").remove();
  const infoGroup = svg.append("g").attr("class", "country-info");
  const isCountry = countryData.find(
    (c) => c.Country === country.properties.name
  );
  const isProvince = canadaProvince.features.find(
    (p) => p.properties.name === country.properties.name
  );

  if (isCountry) {
    const countryInfo = countryData.find(
      (c) => c.Country === country.properties.name
    );
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
      { label: "Economic", value: countryInfo.Economic_Immigrants },
      {
        label: "Family",
        value: countryInfo.Family_Reunification,
      },
      { label: "Refugees", value: countryInfo.Refugees_or_Similar },
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

    const largestCategory = data.reduce(
      (acc, cur) => (cur.value > acc.value ? cur : acc),
      { value: -Infinity }
    );
    const leastCategory = data.reduce(
      (acc, cur) => (cur.value < acc.value ? cur : acc),
      { value: Infinity }
    );

    const totalImmigration = data.reduce((acc, cur) => acc + cur.value, 0);

    const percentage = (largestCategory.value / totalImmigration) * 100;
    const leastPercentage = (leastCategory.value / totalImmigration) * 100;

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", barY + barHeight + 40)
      .text("Largest Immigration Category: ")
      .attr("font-size", "14px");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 30)
      .attr("y", barY + barHeight + 60)
      .text(
        largestCategory.label +
          ": " +
          largestCategory.value +
          " (" +
          percentage.toFixed(2) +
          "%)"
      )
      .attr("font-size", "14px")
      .style("font-weight", "bold");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 10)
      .attr("y", barY + barHeight + 80)
      .text("Least Immigration Category: ")
      .attr("font-size", "14px");

    infoGroup
      .append("text")
      .attr("x", width - width / 3 + 30)
      .attr("y", barY + barHeight + 100)
      .text(
        leastCategory.label +
          ": " +
          leastCategory.value +
          " (" +
          leastPercentage.toFixed(2) +
          "%)"
      )
      .attr("font-size", "14px")
      .style("font-weight", "bold");
  } else if (isProvince) {
    const provinceInfo = isProvince.properties;
    if (provinceInfo.name == provincename) {
      let largestPercentageCountry = countryData[0];
      let secondlargestPercentageCountry = countryData[1];
      let thirdlargestPercentageCountry = countryData[2];

      let largestPercentage =
        (largestPercentageCountry.Total / d3.sum(countryData, (d) => d.Total)) *
        100;

      for (let i = 1; i < countryData.length; i++) {
        const currentPercentage =
          (countryData[i].Total / d3.sum(countryData, (d) => d.Total)) * 100;
        if (currentPercentage > largestPercentage) {
          thirdlargestPercentageCountry = secondlargestPercentageCountry;
          secondlargestPercentageCountry = largestPercentageCountry;
          largestPercentageCountry = countryData[i];
          largestPercentage = currentPercentage;
        } else if (
          currentPercentage >
          (secondlargestPercentageCountry.Total /
            d3.sum(countryData, (d) => d.Total)) *
            100
        ) {
          thirdlargestPercentageCountry = secondlargestPercentageCountry;
          secondlargestPercentageCountry = countryData[i];
        } else if (
          currentPercentage >
          (thirdlargestPercentageCountry.Total /
            d3.sum(countryData, (d) => d.Total)) *
            100
        ) {
          thirdlargestPercentageCountry = countryData[i];
        }
      }

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
        .text("Province Informationnnnnn")
        .attr("font-size", "18px")
        .attr("font-weight", "bold");

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 50)
        .text("Name: " + isProvince.properties.name)
        .attr("font-size", "14px");

      const chartWidth = width / 3 - 20;
      const chartHeight = height / 2 - 20;
      const chartX = width - width / 3 + 10;
      const chartY = 80;

      var customColors = [
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf",
        "#aec7e8",
        "#ffbb78",
        "#98df8a",
        "#ff9896",
        "#c5b0d5",
        "#c49c94",
        "#f7b6d2",
        "#c7c7c7",
        "#dbdb8d",
        "#9edae5",
        "#7f7f7f",
        "#393b79",
        "#637939",
        "#8c6d31",
        "#843c39",
        "#7b4173",
        "#5254a3",
        "#637939",
        "#8c6d31",
        "#843c39",
      ];

      var color = d3
        .scaleOrdinal()
        .domain(
          countryData.map(function (d) {
            return d.Country;
          })
        )
        .range(customColors);

      var pie = d3.pie().value(function (d) {
        return d.Total;
      });

      var pieData = pie(countryData);

      var arc = d3
        .arc()
        .innerRadius(0)
        .outerRadius(Math.min(chartWidth, chartHeight) / 2);

      var arcs = infoGroup
        .selectAll(".arc")
        .data(pieData)
        .enter()
        .append("g")
        .attr("class", "arc")
        .attr(
          "transform",
          "translate(" +
            (chartX + chartWidth / 2) +
            "," +
            (chartY + chartHeight / 2) +
            ")"
        )
        .on("mouseover", function (d) {
          showProvinceTooltip(d, d3.event.pageX, d3.event.pageY);
          d3.select(this).select("path").attr("fill", "orange");
        })
        .on("mouseout", function () {
          d3.select(this)
            .select("path")
            .attr("fill", function (d) {
              return color(d.data.Country);
            });
          tooltip.style("display", "none");
        });

      arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", function (d) {
          return color(d.data.Country);
        });

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 410)
        .text(
          `Largest Immigration: ${
            largestPercentageCountry.Country
          } (${largestPercentage.toFixed(2)}%)`
        )
        .attr("font-size", "14px");

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 430)
        .text(
          `Second Largest Immigration: ${
            secondlargestPercentageCountry.Country
          } (${secondlargestPercentageCountry.Total.toFixed(2)}%)`
        )
        .attr("font-size", "14px");

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 450)
        .text(
          `Third Largest Immigration: ${
            thirdlargestPercentageCountry.Country
          } (${thirdlargestPercentageCountry.Total.toFixed(2)}%)`
        )
        .attr("font-size", "14px");
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
        .text("Province Information")
        .attr("font-size", "18px")
        .attr("font-weight", "bold");

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 50)
        .text("Name: " + provinceInfo.name)
        .attr("font-size", "14px");

      infoGroup
        .append("text")
        .attr("x", width - width / 3 + 10)
        .attr("y", 80)
        .text("No information")
        .attr("font-size", "14px");
    }
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

const quebecCoordsStr = localStorage.getItem("provinceCoords");
let quebecCoords;

if (quebecCoordsStr) {
  quebecCoords = JSON.parse(quebecCoordsStr);
}

function drawMap(worldFeatures, canadaFeatures, countryData) {
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
      return d.properties.name === provincename ? "#D2691E" : null;
    });

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

  const legendNote = "Number of immigrants";
  legendGroup
    .append("text")
    .attr("class", "legend-note")
    .attr("x", legendX + legendWidth / 2)
    .attr("y", legendY - 10)
    .text(legendNote)
    .attr("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-weight", "bold");

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
    return d.properties.name === provincename ? "#D2691E" : null;
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
    return d.properties.name === provincename ? "#D2691E" : null;
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
