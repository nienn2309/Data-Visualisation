        // Chart dimensions
        const width = 1600;
        const height = 700;
        const margin = { top: 40, right: 60, bottom: 100, left: 60 };
        
        // Array of colors for each data group
        const colors = ['#1f77b4', '#aec7e8', '#2ca02c', '#98df8a'];
        
        // Create SVG
        const svg = d3.select("svg")
            .attr("width", width)
            .attr("height", height);
        
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const year = this.textContent;
                const csvFilePath = 'src/data/' + year + '.csv';
                updateChart(csvFilePath);
            });
        });
        
        function updateChart(csvFilePath) {
            // Remove the current chart and redraw with new data from the CSV file
            svg.selectAll("*").remove(); // Remove the current chart
            // Create a fixed rectangle for the data
            const tooltip = d3.select("#tooltip")
                .style("display", "none");
        
            // Create text for the data
            const tooltipText = svg.append("text")
                .attr("class", "tooltip-text")
                .attr("x", 0)
                .attr("y", 0)
                .style("opacity", 0);
            
            
        
            // Read data from CSV file
            d3.csv(csvFilePath).then(data => {
                // Scale for x-axis
                const x = d3.scaleBand()
                    .domain(data.map(d => d.Province))
                    .range([margin.left, width - margin.right])
                    .padding(0.1);
        
                // Scale for y-axis
                const y = d3.scaleLinear()
                    .domain([0, d3.max(data, d => Math.max(d.Economic, d['Sponsored Family'], d['Resettled Refugee & Protected Person in Canada'], d['All Other Immigration']))])
                    .nice()
                    .range([height - margin.bottom, margin.top]);
        
                // Create and attach x-axis
                const xAxis = g => g
                    .attr("transform", `translate(0,${height - margin.bottom})`)
                    .call(d3.axisBottom(x).tickSizeOuter(0))
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", ".15em")
                    .attr("transform", "rotate(-40)")
                    .style("font-size", "9px")
                    .style("font-weight", "bold");
        
                // Scale for the Y-axis
                const yAxis = g => g
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(y)
                .ticks(null, "d")) // Specify "d" for plain numbers without abbreviation
                .style("font-size", "15px")
                .style("font-weight", "bold");
        
        
              // Handle mouseover event on bars
        const handleMouseOver = (event, d) => {
            const value = d.value;
            const province = d3.select(event.currentTarget.parentNode).datum().Province;
            const reason = d.key;
            const tooltipTextContent = `Province: ${province}<br>Migration Categories: ${reason}<br>Number: ${value}`; // Create content for tooltip
        
            const xPosition = event.pageX + 10; // Vị trí x của tooltip dời thêm 10px từ vị trí chuột
            const yPosition = event.pageY - 30; // Vị trí y của tooltip dời lên 30px từ vị trí chuột
        
            tooltip.style("display", "block")
                .style("left", `${xPosition}px`)
                .style("top", `${yPosition}px`)
                .html(tooltipTextContent); // Set content for tooltip
        };
        
        // Handle mouseout event on bars
        const handleMouseOut = () => {
            tooltip.style("display", "none"); // Hide tooltip
        };
        
        
                // Draw bars in the chart
                svg.append("g")
                    .selectAll("g")
                    .data(data)
                    .join("g")
                    .attr("transform", d => `translate(${x(d.Province)},0)`)
                    .selectAll("rect")
                    .data(d => [
                        { key: 'Economic', value: d.Economic },
                        { key: 'Sponsored Family', value: d['Sponsored Family'] },
                        { key: 'Resettled Refugee & Protected Person in Canada', value: d['Resettled Refugee & Protected Person in Canada'] },
                        { key: 'All Other Immigration', value: d['All Other Immigration'] }
                    ])
                    .join("rect")
                    .attr("class", "bar")
                    .attr("x", (d, i) => x.bandwidth() / 4 * i)
                    .attr("y", d => y(0)) // Initial size from 0
                    .attr("width", x.bandwidth() / 4)
                    .attr("height", 0) // Initial size from 0
                    .attr("fill", (d, i) => colors.find((c, index) => index === i))
                    .on("mouseover", handleMouseOver)
                    .on("mouseout", handleMouseOut)
                    // Use transition to add animation
                    .transition()
                    .duration(1000) // Animation duration (1 second)
                    .attr("y", d => y(d.value)) // Reset the height of the bar
                    .attr("height", d => y(0) - y(d.value)) // Reset the width of the bar
                    .style("stroke", "#000") // Border color
                    .style("stroke-width", "2px"); // Border width
        
                // Attach x and y axis to SVG
                svg.append("g")
                    .call(xAxis)
                    .selectAll(".tick text")
                    .text(d => d.split(" - ")[0]); // Get province name
        
                svg.append("g")
                    .call(yAxis);
        
                // Chart title
                svg.append("text")
                    .attr("x", (width / 2))
                    .attr("y", (margin.top / 2))
                    .attr("text-anchor", "middle")
                    .style("font-size", "25px")
                    .text("Immigration Categories by Province")
                    .style("font-weight", "bold");
        
                // Y-axis label
                svg.append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - margin.left)
                    .attr("x", 0 - (height / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("Number of Immigrants");
        
                // Create legend rectangle for each Immigration Category
                const legendRectSize = 18;
                const legendSpacing = 4;
                const legend = svg.selectAll('.legend')
                    .data(['Economic', 'Sponsored Family', 'Resettled Refugee & Protected Person', 'All Other Immigration'])
                    .enter()
                    .append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i) => {
                        const offset = legendRectSize + legendSpacing;
                        const horz = width - 250;
                        const vert = i * offset + 20;
                        return 'translate(' + horz + ',' + vert + ')';
                    });
                // Add rectangle to the legend with corresponding color
                legend.append('rect')
                    .attr('width', legendRectSize)
                    .attr('height', legendRectSize)
                    .style('fill', (d, i) => colors[i])
                    .style('stroke', '#000') // Border color
                    .style('stroke-width', '1px'); // Border width
        
                // Add label to the legend
                legend.append('text')
                    .attr('x', legendRectSize + legendSpacing)
                    .attr('y', legendRectSize - legendSpacing)
                    .text(d => d)
                    .style('font-size', '14px')
                    .attr('fill', '#000');
            });
        }
        document.addEventListener("DOMContentLoaded", function () {
            const defaultButton = document.getElementById('btn-2020'); // Select the "2021" button by default
            defaultButton.classList.add('selected'); // Add the "selected" class to the default button
        
            // Activate click event for the default button
            defaultButton.click();
        });