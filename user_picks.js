var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1cI78iHZaqsk9i3QPYZnbaIy_ZIFK0xct1yC4XItZZkk/pubhtml';

function renderSpreadsheetData() {
	Tabletop.init( { key: publicSpreadsheetUrl,
				 callback: draw,
				 simpleSheet: true } )
}

function draw(data, tabletop) {
	console

	results = tabletop.sheets("picks")
	main_data = results.elements

	weekly_results = tabletop.sheets("weekly results")
	rose_order = weekly_results.elements

	var max = _.maxBy(rose_order, function(o) {
					return o.week;
			})

	most_recent_rose_order = rose_order.filter(function (a) {
		return a.week == max.week ;
	});

	//reshaping our wide data to long

	long_data = [];
	main_data.forEach( function(row) {
		// Loop through all of the columns, and for each column
		// make a new row
		Object.keys(row).forEach( function(colname) {
	  	// Ignore 'State' and 'Value' columns
	  	if(colname == "What is your first and last name?") {
	    	return
	  	}
	  	else if(new Set(contestants).has(colname)){
	  		long_data.push({"Name": row["What is your first and last name?"], "pick_rank": row[colname], "pick_name": colname});
	  	}
		});
	});

	long_data.forEach( function(n) {
		n.pick_rank = +n.pick_rank	
	})	

	roses_and_picks = _.map(long_data, function(obj) {
		return _.assign(obj, _.find(most_recent_rose_order, {
			name : obj.pick_name
		}));
	});

	roses_and_picks.forEach(function(d){
		d.rose_order = +d.rose_order
	})

	UserPicks(roses_and_picks)

	rankings_over_time = tabletop.sheets("weekly rankings")
	ranking_data = rankings_over_time.elements

	//var chartEl = document.querySelector('#chart');
	//var rect = chartEl.getBoundingClientRect();
	//document.querySelector('.loading').style.display = 'none';
	//drawChart(ranking_data, rect.width, rect.height);	
}

renderSpreadsheetData();

contestants = ["Brian","Cam","Chasen","Connor J.","Connor S.","Daron","Devin","Dustin","Dylan","Garrett","Grant",
				"Hunter","Jed","Joe","Joey J.","John Paul Jones","Jonathan","Kevin","Luke P.","Luke S.","Matt Donald",
				"Matteo","Matthew","Mike","Peter","Ryan","Scott","Thomas","Tyler C.","Tyler G."]

function UserPicks(data) {

	list = _.uniqBy(long_data, function (e) {
		return e.Name;
	});

	var names = _.map(list, 'Name').sort();

	var dropDown = d3.select('#nameDropdown')

	dropDown
	  .selectAll("option")
	  .data(names)
	  .enter()
	  .append("option")
		.attr("value", function (d) { return d; })
		.text(function (d) {
			return d[0].toUpperCase() + d.slice(1,d.length);
		})
	  .on("change", onchange)

	dropDown.on('change',function() {

		var selectValue = d3.select(this)
			.property('value');

		updateTable(long_data,selectValue);

	})

	// now get average contestant ranks to be merged in later

	avg_ranks = _(long_data)
		.groupBy('pick_name')
		.map((pick_name, id) => ({
			pick_name: id,
			avg_rank : _.meanBy(pick_name, 'pick_rank'),
		}))
		.value()

	avg_ranks = _.orderBy(avg_ranks, ['avg_rank'], ['asc']);

	adjusted_rank = 1

	avg_ranks.forEach(function(i){
		i.adjusted_rank = adjusted_rank
		adjusted_rank = i.adjusted_rank + 1
	})

	merged_data = _.map(long_data, function(obj) {
		return _.assign(obj, _.find(avg_ranks, {
			pick_name : obj.pick_name
		}));
	});

	var updateTable = function(data,filter_param) {

		document.getElementById("name").innerHTML = "Bachelorette Picks for: <b>" + filter_param + "</b>"

		d3.select("#bach-picks-table tbody").remove();
		d3.select("#bach-picks-table thead").remove();


		var table = d3.select('#bach-picks-table')
			.append('table')

		var thead = table.append('thead')
		var	tbody = table.append('tbody');

		merged_data = _.orderBy(merged_data, ['pick_rank'], ['asc']);

		display_cols = ['Contestant Name','Contestant Rank','Avg. Contestant Rank']
		columns = ['pick_name','pick_rank','adjusted_rank']

		filtered_data = merged_data.filter(function (a) { return a.Name == filter_param ; });		

		//// append the header row
		thead.append('tr')
		  .selectAll('th')
		  .data(display_cols).enter()
		  .append('th')
			.text(function (column) { return column; });

		// create a row for each object in the data
		var rows = tbody.selectAll('tr')
		  .data(filtered_data)
		  .enter()
		  .append('tr');

		rows.exit().remove();

		eliminated = filtered_data.filter(function (a) { return a.eliminated == "1" ; });		

		var color = d3.scaleOrdinal()
		    .domain(eliminated)
		    .range("#FF0000", "#FF0000");

		// create a cell in each row for each column
		cells = rows.selectAll('td')
			.data(function (row) {
				return columns.map(function (column) {
					return {column: column, value: row[column]};
				});
			})
			.enter()
			.append('td')
			.style("background-color", function(d){ if(d.column == "pick_name") return color(d.value);})
			.text(function (d) { return d.value; });

		cells.exit().remove();

	}	

	temp_filter = 'Age Order'

	updateTable(merged_data,temp_filter)

	console.log(avg_ranks)
}

function drawChart(data, width, height) {

	var dullOpacity = 0.1;
	var brightOpacity = 0.3;
	var transitionDuration = 1000;

	var margin = {
		top: 50,
		left: 50,
		right: 75,
		bottom: 50
	};

	width = 1000 - margin.left - margin.right,
	height = 1500 - margin.top - margin.bottom;

	var chart = d3.select('#chart')
		.attr('width', width)
		.attr('height', height);

	temp_data = data

	weeks = d3.map(temp_data, function(d) { return d.week; }).keys().map(function(d) { return Number(d); });	
	teams = temp_data.map(function(d) { return d.Name});

	most_recent_week = Math.max(...weeks)
	most_recent_week_result = temp_data.filter(function(d) { return d.week == most_recent_week })
	current_leader = most_recent_week_result[0].Name

	prev_week = most_recent_week - 1
	prev_week_data = temp_data.filter(function(d) { return d.week == prev_week })

	//prev_week_data = prev_week_data.map(function(a) {
	//	a.prev_week_standing = a.standing;
	//	a.prev_week = a.week;
	//});	

	change = _(prev_week_data) // start sequence
		.keyBy('Name') // create a dictionary of the 1st array
		.mergeWith(_.keyBy(most_recent_week_result, 'Name')) // create a dictionary of the 2nd array, and merge it to the 1st
		.values() // turn the combined dictionary to array
		//.value() 

	//change_in_time = _.map(prev_week_data, function(obj) {
	//					return _.assign(obj, _.find(most_recent_week_result, {
	//						Name : obj.Name 
	//					}));
	//				});

	console.log(data)

	document.getElementById("current_leader").innerHTML = "Current Leader (as of week " + most_recent_week + ")" + ": <b>" + current_leader + "</b>"

	// week
	var x = d3.scaleLinear()
		.range([margin.left , width - margin.right])
		.domain([1,9]);

	num_rows = data.filter(function(d) { return d.week == "1" }).length	

	// position
	var y = d3.scaleLinear()
		.range([margin.top, height - margin.bottom])
		.domain([1, num_rows]);

	var y2 = d3.scaleBand()
		.range([margin.top, height - margin.bottom])

	var xAxis = d3.axisTop()
		.ticks(weeks.length)
		.tickFormat(function(d) { return 'Week ' + d })
		.scale(x);

	var yAxis = d3.axisLeft()
		.ticks(10)
		.scale(y);

	var yAxisRight = d3.axisRight()
		//.tickFormat(data.map(function(d) { return d.Name}))
		//.ticks(65)
		.scale(y2);	
	
	//y2.domain(data.map(function(d) { return d.Name}))

	// show weeks
	chart.append('g')
		.attr('class', 'axis x-axis')
		.transition()
		.duration(transitionDuration)
		.attr('transform', 'translate(0,' + ((margin.top/2) - 5) + ')')
		.call(xAxis)
		.selectAll('text')
		.attr('dy', 2)

	// show position
	chart.append('g')
		.attr('class', 'axis y-axis')
		.attr('transform', 'translate(' + x(.75) + ', 0)')
		.transition()
		.duration(transitionDuration)
		.call(yAxis)
	
	chart.append('text')
		//.attr("x", 15)
		.attr("y", 15)
		.attr("transform", "rotate(-90)")
		.attr("fill", "#000")
		.text("Standing");

	chart.append("g")				
		.attr('class', 'axis y-axis')
		.attr("id", "yaxis")
		.attr("transform", "translate(" + (width - 70) + " ,0)")
		.call(yAxisRight)

	chart.selectAll(".text")
		.data(data)
		.enter()
		.filter(function(d) {
			return d.week == most_recent_week
		})
		.append("text")
		.attr("class", "text")
		.attr("x", 810)
		.attr("y", function(d) { return y(d.standing) + 5 ; })
		.text(function(d) { return d.Name;})
		.on("mouseover", function(type) {
			d3.selectAll(".text")
				.style("opacity", 0.1);
			d3.select(this)
				.style("opacity", 1);
			d3.selectAll(".dot")
				.style("opacity", 0.1)
				.filter(function(d) { 
					return d.Name == type.Name; })
				.style("opacity", 1);
			d3.selectAll(".line")
				.style("opacity", 0.1)
				.filter(function(d) { 
					return d.key == type.Name; })
				.style("opacity", 1);

			showTooltip(type)

		})	
		.on("click", function(type) {
			d3.selectAll(".text")
				.style("opacity", 0.1);
			d3.select(this)
				.style("opacity", 1);
			d3.selectAll(".dot")
				.style("opacity", 0.1)
				.filter(function(d) { 
					return d.Name == type.Name; })
				.style("opacity", 1);
		})	
		.on("mouseout", function(type) {
			d3.selectAll(".text")
				.style("opacity", 1);
			d3.selectAll("circle")
				.style("opacity", 1);		
			d3.selectAll(".line")
				.style("opacity", 1);

			hideTooltip(type)				
		})

	var valueline = d3.line()
		.curve(d3.curveCardinal)
		.x(function(d) { return x(d.week); })
		.y(function(d) { return y(d.standing); });	

	data.forEach(function(d) {
		d.standing = +d.standing;
		d.week = d.week;
	});

	nest = d3.nest()
		.key(function(d){
			return d.Name;
		})
		.entries(data)

	chart.selectAll(".line")
		.data(nest)
		.enter()
		.append("path")
		.attr("class", "line")
		.style("opacity", 0.75)
		.attr("d", function(d){
				return valueline(d.values)
			});	

	chart.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", function (d) { return x(d.week); })
        .attr("cy", function (d) { return y(d.standing); })
        .attr("r", 5)
		.on("mouseover", function(d) {		
			showTooltip(d)
		})					
		.on("mouseout", function(d) {		
			hideTooltip(d)	
		})		

	function showTooltip(d) {
		var tooltipWidth = d.Name.length * 12;
		
		var tooltip = chart.append('g')
		  .attr('class', 'tooltip');
		
		var tooltipRect = tooltip.append('rect')
		  .attr('width', 0)
		  .attr('height', 60)
		  .attr('fill', 'black')
		  .attr('rx', 3)
		  .attr('ry', 3)
		  .style('opacity', 0)
		  .attr('x', x(d.week))
		  .attr('y', y(d.standing) - 30)
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 0.5)
		  .attr('width', tooltipWidth)
		  .attr('y', y(d.standing) - 60);
		
		var tooltipName = tooltip.append('text')
		  .attr('fill', 'white')
		  .style('opacity', 0)
		  .attr('x', x(d.week) + 5)
		  .attr('y', y(d.standing) - 20)
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 1)
		  .attr('y', y(d.standing) - 42)
		  .text("Name: " + d.Name);

		var tooltipScore = tooltip.append('text')
		  .attr('fill', 'white')
		  .style('opacity', 0)
		  .attr('x', x(d.week) + 5)
		  .attr('y', y(d.standing) - 20)
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 1)
		  .attr('y', y(d.standing) - 28)
		  .text("Score: "  + d.Score);

		var tooltipStanding = tooltip.append('text')
		  .attr('fill', 'white')
		  .style('opacity', 0)
		  .attr('x', x(d.week) + 5)
		  .attr('y', y(d.standing) - 20)
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 1)
		  .attr('y', y(d.standing) - 14)
		  .text("Rank: "  + d.standing);

	}

	function hideTooltip(d) {
		chart.selectAll('.tooltip text')
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 0);
		chart.selectAll('.tooltip rect')
		  .transition()
		  .duration(transitionDuration/2)
		  .style('opacity', 0)
		  .attr('y', function() {
		    return +d3.select(this).attr('y') + 40;
		  })
		  .attr('width', 0)
		  .attr('height', 0);
		chart.select('.tooltip').transition().delay(transitionDuration/2).remove();
	}		
}

