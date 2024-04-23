const width = 1400;
const height = 600;
const margin = { top: 40, right: 60, bottom: 150, left: 100 };

const colors = ["#1f77b4", "#aec7e8", "#2ca02c", "#98df8a"];

// Create SVG
const svg = d3.select("svg").attr("width", width).attr("height", height);

const buttons = document.querySelectorAll("button");
buttons.forEach((button) => {
  button.addEventListener("click", function () {
    const year = this.textContent;
    const csvFilePath = "src/data/" + year + ".csv";
    updateChart(csvFilePath);
  });
});

function updateChart(csvFilePath) {
  // Remove the current chart and redraw with new data from the CSV file
  svg.selectAll("*").remove(); // Remove the current chart
  // Create a fixed rectangle for the data
  const tooltip = d3.select("#tooltip").style("display", "none");

  // Create text for the data
  const tooltipText = svg
    .append("text")
    .attr("class", "tooltip-text")
    .attr("x", 0)
    .attr("y", 0);

  // Read data from CSV file
  d3.csv(csvFilePath).then((data) => {
    // Scale for x-axis
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.Province))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    // Scale for y-axis
    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, (d) =>
          Math.max(
            d.Economic,
            d["Sponsored Family"],
            d["Resettled Refugee & Protected Person in Canada"],
            d["All Other Immigration"]
          )
        ),
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Create and attach x-axis
    const xAxis = (g) =>
      g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-40)")
        .style("font-size", "14px")
        .style("font-weight", "bold");

    // Scale for the Y-axis
    const yAxis = (g) =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, "d")) // Specify "d" for plain numbers without abbreviation
        .style("font-size", "15px")
        .style("font-weight", "bold");

    // Function to draw pie chart for each province when hovering over the bars
    const drawPieChartOnHover = (event, provinceData) => {
      // Define pie data
      const pieData = [
        {
          category: "Economic",
          value: provinceData.Economic,
        },
        {
          category: "Sponsored Family",
          value: provinceData["Sponsored Family"],
        },
        {
          category: "Resettled Refugee & Protected Person in Canada",
          value: provinceData["Resettled Refugee & Protected Person in Canada"],
        },
        {
          category: "All Other Immigration",
          value: provinceData["All Other Immigration"],
        },
      ];

      // Calculate total for the selected province
      const total = pieData.reduce((acc, cur) => acc + cur.value, 0);

      // Define pie chart dimensions
      const pieWidth = 200;
      const pieHeight = 200;
      const radius = Math.min(pieWidth, pieHeight) / 2;

      // Define color scale
      const colorScale = d3
        .scaleOrdinal()
        .domain(pieData.map((d) => d.category))
        .range(colors);

      // Define pie layout
      const pie = d3
        .pie()
        .sort(null)
        .value((d) => d.value);

      // Define arc generator
      const arc = d3.arc().innerRadius(0).outerRadius(radius);

      // Remove previous pie chart if exists
      d3.select("#pie-chart").remove();

      // Append new SVG for pie chart
      const svgPie = d3
        .select("#tooltip")
        .append("svg")
        .attr("id", "pie-chart")
        .attr("width", pieWidth)
        .attr("height", pieHeight)
        .append("g")
        .attr(
          "transform",
          "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")"
        );

      // Draw slices
      // Draw slices
      const arcs = svgPie
        .selectAll("arc")
        .data(pie(pieData))
        .enter()
        .append("g")
        .attr("class", "arc");

      arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => colorScale(d.data.category))
        .attr("stroke", "grey")
        .attr("stroke-width", 0.4)
        .append("title")
        .text(
          (d) =>
            `${d.data.category}: ${((d.data.value / total) * 100).toFixed(2)}%`
        );
    };

    let hoveredCategory = null;

    // Handle mousemove event on bars
    const handleMouseMove = (event, d) => {
      const provinceData = d3.select(event.currentTarget.parentNode).datum();
      hoveredCategory = d.key;
      drawPieChartOnHover(event, provinceData);
    };

    // Handle mouseover event on bars
    const handleMouseOver = (event, d) => {
      const value = d.value;
      const provinceData = d3.select(event.currentTarget.parentNode).datum();
      const province = provinceData.Province;
      const reason = d.key;
      const color = colors.find(
        (c, i) =>
          i ===
          [
            "Economic",
            "Sponsored Family",
            "Resettled Refugee & Protected Person in Canada",
            "All Other Immigration",
          ].indexOf(reason)
      );
      const total = Object.values(provinceData)
  .slice(1) // Exclude the first element which is the Province name
  .reduce((acc, curr) => acc + parseInt(curr), 0);

      console.log(total)

      const tooltipTextContent = `
        Province: ${province}<br>
        Migration Category: ${reason} <span style="color: ${color}">&#9632;</span> <br>
        <strong>Number: ${value} (${((value / total) * 100).toFixed(2)}%)</strong><br>
      `;

      const xPosition = event.pageX + 10;
      const yPosition = event.pageY - 30;

      tooltip
        .style("display", "block")
        .style("left", `${xPosition}px`)
        .style("top", `${yPosition}px`)
        .html(tooltipTextContent);
      hoveredCategory = d.key;
    };

    // Handle mouseout event on bars
    const handleMouseOut = () => {
      tooltip.style("display", "none"); // Hide tooltip
      d3.select(event.currentTarget).style("stroke", "none");
      d3.select("#pie-chart").remove();
    };

    // Draw bars in the chart
    svg
      .append("g")
      .selectAll("g")
      .data(data)
      .join("g")
      .attr("transform", (d) => `translate(${x(d.Province)},0)`)
      .selectAll("rect")
      .data((d) => [
        { key: "Economic", value: d.Economic },
        { key: "Sponsored Family", value: d["Sponsored Family"] },
        {
          key: "Resettled Refugee & Protected Person in Canada",
          value: d["Resettled Refugee & Protected Person in Canada"],
        },
        { key: "All Other Immigration", value: d["All Other Immigration"] },
      ])
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => (x.bandwidth() / 4) * i)
      .attr("y", (d) => y(0)) // Initial size from 0
      .attr("width", x.bandwidth() / 4)
      .attr("height", 0) // Initial size from 0
      .attr("fill", (d, i) => colors.find((c, index) => index === i))
      .on("mouseover", handleMouseOver)
      .on("mousemove", handleMouseMove) // Thay vì .on("mouseover", handleMouseOver)

      .on("mouseout", handleMouseOut)
      // Use transition to add animation
      .transition()
      .duration(1000) // Animation duration (1 second)
      .attr("y", (d) => y(d.value)) // Reset the height of the bar
      .attr("height", (d) => y(0) - y(d.value)), // Reset the width of the bar
      // Attach x and y axis to SVG
      svg
        .append("g")
        .call(xAxis)
        .selectAll(".tick text")
        .text((d) => d.split(" - ")[0]); // Get province name

    svg.append("g").call(yAxis);

    // Chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "25px")
      .text("Immigration Categories by Province")
      .style("font-weight", "bold");

    // Y-axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Number of Immigrants");

    // Create legend rectangle for each Immigration Category
    const legendRectSize = 18;
    const legendSpacing = 4;
    const legend = svg
      .selectAll(".legend")
      .data([
        "Economic",
        "Sponsored Family",
        "Resettled Refugee & Protected Person",
        "All Other Immigration",
      ])
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => {
        const offset = legendRectSize + legendSpacing;
        const horz = width - 250;
        const vert = i * offset + 20;
        return "translate(" + horz + "," + vert + ")";
      });
    // Add rectangle to the legend with corresponding color
    legend
      .append("rect")
      .attr("width", legendRectSize)
      .attr("height", legendRectSize)
      .style("fill", (d, i) => colors[i])
      .style("stroke", "#000") // Border color
      .style("stroke-width", "1px"); // Border width

    // Add label to the legend
    legend
      .append("text")
      .attr("x", legendRectSize + legendSpacing)
      .attr("y", legendRectSize - legendSpacing)
      .text((d) => d)
      .style("font-size", "14px")
      .attr("fill", "#000");
  });
}
document.addEventListener("DOMContentLoaded", function () {
  const defaultButton = document.getElementById("btn-2020"); // Select the "2021" button by default
  defaultButton.classList.add("selected"); // Add the "selected" class to the default button

  // Activate click event for the default button
  defaultButton.click();
});
buttons.forEach((button) => {
  button.addEventListener("click", function () {
    buttons.forEach((btn) => {
      btn.classList.remove("selected");
    });
    this.classList.add("selected");
    const year = this.textContent;
    const csvFilePath = year + ".csv";
    updateChart(csvFilePath);
  });
});
