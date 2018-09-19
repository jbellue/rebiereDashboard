var myApp = myApp || {};

d3.timeFormatDefaultLocale({
    "decimal": ",",
    "thousands": " ",
    "grouping": [3],
    "currency": ["€", ""],
    "dateTime": "%a %b %e %X %Y",
    "date": "%d/%m/%Y",
    "time": "%H:%M:%S",
    "periods": ["AM", "PM"],
    "days": ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    "shortDays": ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "shortMonths": ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "dec."]
});

const options = {
    "sizes": {
        "width": 530,
        "height": 315,
        "wPad": 36,
        "hPad": 48
    },
    "axes": {
        "temperature": {
            "label": "Température",
            "unit": "°C",
            "colour": "red",
            "fillColour": "red",
            "line": {
                "active": true,
            }
        },
        "pressure": {
            "label": "Pression",
            "unit": "hPa",
            "colour": "green",
            "fillColour": "green",
            "line": {
                "active":true,
            }
        },
        "light": {
            "label": "Luminosité",
            "unit": "",
            "colour": "orange",
            "fillColour": "orange",
            "line": {
                "active": true,
            }
        },
        "water": {
            "label": "Niveau d'eau",
            "unit": "cm",
            "colour": "steelblue",
            "fillColour": "lightblue",
            "line": {
                "active": true,
            }
        },
    },
    "labelNames": ["timeLabel", "temperatureLabel", "pressureLabel", "lightLabel", "waterLabel"]
}

// Get the data
myApp.getData = (filename) => {
    return new Promise(function (resolve, reject) {
        d3.json(filename).then((data) => {
            data = data.Items;
            const parseTime = d3.timeParse("%s");
            data.forEach(d => {
                d.timestamp = parseTime(d.timestamp);
                d.temperature = +d.temperature;
                d.pressure = +d.pressure;
                d.light = +d.light;
                d.waterLevel = +d.waterLevel;
            });
            resolve(data);
        });
    });
}

myApp.drawChart = (data, id) => {
    const fullChart = d3.select(`#${id}`).append("svg")
        .attr("width", options.sizes.width + 2*options.sizes.wPad)
        .attr("height", options.sizes.height + 2*options.sizes.hPad)
        .append("g")
            .attr("transform", `translate(${options.sizes.wPad},5)`);

    const timeAxis = d3.scaleTime()
        .domain(d3.extent(data, d => d.timestamp ))
        .range([0, options.sizes.width]);
    const temperatureAxis = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.temperature) )])
        .range([options.sizes.height, 0]);
    const pressureAxis = d3.scaleLinear()
        .domain(d3.extent(data, d => d.pressure ))
        .range([options.sizes.height, 0]);
    const lightAxis = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.light) )])
        .range([options.sizes.height, 0]);
    const waterLevelAxis = d3.scaleLinear()
        .domain ([0, 400])
        .range([options.sizes.height, 0]);

    // Add the waterLine path and area.
    fullChart.append("path")
        .data([data])
            .attr("class", "water line")
            .style("fill", options.axes.water.fillColour)
            .style("stroke", options.axes.water.colour)
            .attr("d", d3.area()
                .curve(d3.curveStepAfter)
                .defined(d => d.waterLevel)
                .x(d => timeAxis(d.timestamp))
                .y0(options.sizes.height)
                .y1(d => waterLevelAxis(d.waterLevel)));

    // Add the temperatureLine path.
    fullChart.append("path")
        .data([data])
        .style("stroke", options.axes.temperature.colour)
        .attr("class", "temperature line")
        .attr("d", d3.line()
            .curve(d3.curveMonotoneX)
            .defined(d => d.temperature)
            .x(d => timeAxis(d.timestamp))
            .y(d => temperatureAxis(d.temperature)));

    // Add the pressureLine path.
    fullChart.append("path")
        .data([data])
        .style("stroke", options.axes.pressure.colour)
        .attr("class", "pressure line")
        .attr("d", d3.line()
            .curve(d3.curveMonotoneX)
            .defined(d => d.pressure)
            .x(d => timeAxis(d.timestamp))
            .y(d => pressureAxis(d.pressure)));

    // Add the lightLine path.
    fullChart.append("path")
        .data([data])
        .style("stroke", options.axes.light.colour)
        .attr("class", "light line")
        .attr("d", d3.line()
            .curve(d3.curveMonotoneX)
            .defined(d => d.light)
            .x(d => timeAxis(d.timestamp))
            .y(d => lightAxis(d.light)));

    // Add the X Axis
    fullChart.append("g")
        .attr("transform", `translate(0,${options.sizes.height})`)
        .call(d3.axisBottom(timeAxis));

    // Add the temperature Axis
    fullChart.append("g")
        .attr("class", "temperature axisRed")
        .call(d3.axisLeft(temperatureAxis));

    // Add the pressure Axis
    fullChart.append("g")
        .attr("class", "pressure axisGreen")
        .call(d3.axisRight(pressureAxis));

    // Add the water Axis
    fullChart.append("g")
        .attr("class", "water axisSteelBlue")
        .attr("transform", `translate(${options.sizes.width}, 0 )`)
        .call(d3.axisLeft(waterLevelAxis));

    // Add the light Axis
    fullChart.append("g")
        .attr("class", "light axisOrange")
        .attr("transform", `translate(${options.sizes.width}, 0 )`)
        .call(d3.axisRight(lightAxis));


    /*************************************************/
    /*             All the legend stuff              */
    /*************************************************/
    var optionsList = d3.entries(options.axes);
    const legendRectSize = 18;
    const legendSpacing = 4;
    let legend = fullChart.selectAll('.legend')
        .data(optionsList)
        .enter()
        .append('g')
        .on("click", d => {
            d.value.line.active = !d.value.line.active;
            d3.selectAll(`.${d.key}`)
                .style("opacity", d.value.line.active ? 1 : 0.1);
        })
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${ i * 120},${options.sizes.height + 30})`)
    legend.append('rect')
        .attr("class", d => d.key)
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', d => d.value.fillColour)
        .style('stroke', d => d.value.colour);
    legend.append('text')
        .attr("class", d => d.key)
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(d => `${d.value.label}${d.value.unit?` (${d.value.unit})`:''}`);


    /*************************************************/
    /*             All the tooltip stuff             */
    /*************************************************/
    let tooltip = fullChart.append("g")
        .style("display", "none");

    // add the tooltip background
    tooltip.append("rect")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("id", "rectangleTooltip")
        .style("fill", "#0D47A1")
        .style("opacity", 0.9);

    // add the vertical line
    tooltip.append("line")
        .attr("id", "verticalTooltipLine")
        .style("stroke", "blue")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.5)
        .attr("y1", 0)
        .attr("y2", options.sizes.height);

    // group all the labels so we can get their size later on
    let toolTipLabels = tooltip.append("g")
        .attr("id", "tooltipText");
    toolTipLabels.selectAll("text")
        .data(options.labelNames)
        .enter()
        .append("text")
        .style("fill", "white")
        .attr("id", data => data);

    // append the rectangle to capture mouse
    fullChart.append("rect")
        .attr("width", options.sizes.width)
        .attr("height", options.sizes.height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => tooltip.style("display", null))
        .on("mouseout", () => tooltip.style("display", "none"))
        .on("mousemove", mousemove)
        .on("touchmove", mousemove);

    function mousemove() {
        const mouseX = d3.touches(this)[0] ? d3.touches(this)[0][0] : d3.mouse(this)[0];
        const mouseY = d3.touches(this)[0] ? d3.touches(this)[0][1] : d3.mouse(this)[1];
        const date = timeAxis.invert(mouseX);
        const formatTime = d3.timeFormat("%A %e %B, %H:%M");
        const bisectDate = d3.bisector(d => d.timestamp).left;
        const index = bisectDate(data, date);
        const temperature = data[index].temperature;
        const pressure = data[index].pressure;
        const light = data[index].light;
        const water = (index - 1 < 0) ? null : data[index - 1].waterLevel;

        tooltip.select("#verticalTooltipLine")
            .attr("transform", `translate(${mouseX},0)`);

        toolTipLabels.attr("transform", `translate(${mouseX + 30},${mouseY})`)

        toolTipLabels.select(`#${options.labelNames[0]}`)
            .attr("transform", `translate(0,-8)`)
            .text(formatTime(date));


        let i = 0;
        if (temperature) ++i;
        toolTipLabels.select(`#${options.labelNames[1]}`)
            .style("display", temperature ? null : "none")
            .attr("transform", `translate(0,${16 * i})`)
            .text(`Température : ${temperature}°C`);

        if (pressure) ++i;
        toolTipLabels.select(`#${options.labelNames[2]}`)
            .style("display", pressure ? null : "none")
            .attr("transform", `translate(0,${16 * i})`)
            .text(`Pression : ${pressure}hPa`);

        if (light) ++i;
        toolTipLabels.select(`#${options.labelNames[3]}`)
            .style("display", light ? null : "none")
            .attr("transform", `translate(0,${16 * i})`)
            .text(`Luminosité : ${light}`);

        if (water) ++i;
        toolTipLabels.select(`#${options.labelNames[4]}`)
            .style("display", water ? null : "none")
            .attr("transform", `translate(0,${16 * i})`)
            .text(`Niveau d'eau : ${water}cm`);

        const labelsBBox = toolTipLabels.node().getBBox();
        const tooltipBox = {
            x: mouseX + 15,
            y: mouseY - 34,
            width: labelsBBox.width + 30,
            height: labelsBBox.height + 30
        }

        let boxMoved = false;
        if (tooltipBox.x + tooltipBox.width > options.sizes.width) {
            // set the right place for the box
            tooltipBox.x -= tooltipBox.width + 30;
            boxMoved = true;
        }
        if (tooltipBox.y + tooltipBox.height > options.sizes.height) {
            // set the right place for the box
            tooltipBox.y += options.sizes.height - tooltipBox.y - tooltipBox.height;
            boxMoved = true;
        }
        else if (tooltipBox.y < 0) {
            tooltipBox.y = 0;
            boxMoved = true;
        }
        if(boxMoved) {
            // move the text to the right place
            toolTipLabels.attr("transform", `translate(${tooltipBox.x + 15},${tooltipBox.y + 34})`)
        }
        tooltip.select("#rectangleTooltip")
            .attr("transform", `translate(${tooltipBox.x},${tooltipBox.y})`)
            .attr("width", tooltipBox.width)
            .attr("height", tooltipBox.height);
    }
}
myApp.getLastValue = (data, key) => {
    let i = data.length - 1;
    let returnValue = data[i][key];
    while(!returnValue && i >= 0) returnValue = data[--i][key];
    return returnValue ? returnValue : -1;
}

myApp.setGauge = (value, id) => {
    let liquidFillGaugeConfig = liquidFillGaugeDefaultSettings();
    liquidFillGaugeConfig.minValue = 0;
    liquidFillGaugeConfig.maxValue = 400;
    liquidFillGaugeConfig.displayPercent = false;
    liquidFillGaugeConfig.waveAnimateTime = 10000;
    loadLiquidFillGauge(id, value, liquidFillGaugeConfig);
}
