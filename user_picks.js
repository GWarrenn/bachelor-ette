var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1cI78iHZaqsk9i3QPYZnbaIy_ZIFK0xct1yC4XItZZkk/pubhtml';

function renderSpreadsheetData() {
	Tabletop.init( { key: publicSpreadsheetUrl,
				 callback: draw,
				 simpleSheet: true } )
}

function draw(data, tabletop) {

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
	calculateScores(roses_and_picks)
}

renderSpreadsheetData();

contestants = ["Ben G.","Brian B.","Cameron A.","Chasen C.","Connor J.","Connor S.","Daron B.","Devin H.",
"Dustin K.","Dylan B.","Garrett P.","Grant E.","Hunter J.","Jed W.","Joe B.","Joe R.",
"Joey J.","John Paul J.","Jonathan S.","Kevin F.","Luke P.","Luke S.","Matt D.","Matt D. (2)",
"Matt S.","Matteo V.","Mike J.","Peter W.","Ryan S.","Scott A.","Thomas S.","Tyler C.","Tyler G."]

function calculateScores(picks,roses){

	function pearsonCorrelation(independent, dependent) {
	    // covariance
	    let independent_mean = arithmeticMean(independent);
	    let dependent_mean = arithmeticMean(dependent);
	    let products_mean = meanOfProducts(independent, dependent);
	    let covariance = products_mean - (independent_mean * dependent_mean);

	    // standard deviations of independent values
	    let independent_standard_deviation = standardDeviation(independent);

	    // standard deviations of dependent values
	    let dependent_standard_deviation = standardDeviation(dependent);

	    // Pearson Correlation Coefficient
	    let rho = covariance / (independent_standard_deviation * dependent_standard_deviation);

    	return rho;
	}
	function arithmeticMean(data) {
		let total = 0;

		// note that incrementing total is done within the for loop
		for(let i = 0, l = data.length; i < l; total += data[i], i++);

		return total / data.length;
	}


	function meanOfProducts(data1, data2){
		let total = 0;

		// note that incrementing total is done within the for loop
		for(let i = 0, l = data1.length; i < l; total += (data1[i] * data2[i]), i++);

		return total / data1.length;
	}


	function standardDeviation(data){
		let squares = [];

		for(let i = 0, l = data.length; i < l; i++){
	    	squares[i] = Math.pow(data[i], 2);
		}

		let mean_of_squares = arithmeticMean(squares);
		let mean = arithmeticMean(data);
		let square_of_mean = Math.pow(mean, 2);
		let variance = mean_of_squares - square_of_mean;
		let std_dev = Math.sqrt(variance);

		return std_dev;
	}

	weekly_scores = _(roses_and_picks)
		.groupBy('pick_name')
		.map((pick_name, id) => ({
			pick_name: id,
			correlation : standardDeviation('pick_rank'),
		}))
		.value()

}

function UserPicks(data) {

	list = _.uniqBy(long_data, function (e) {
		return e.Name;
	});

	var names = _.map(list, 'Name');

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

		display_cols = ['Contestant Name','Contestant Rank','Avg. Contestant Rank¹']
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

	temp_filter = 'Test 01'

	updateTable(merged_data,temp_filter)

	console.log(avg_ranks)
}



