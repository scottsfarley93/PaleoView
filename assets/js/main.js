/**
 * @author Scott Farley
 */

//global vars
var globals = {}
globals.defaultAttribute = "22000-21000"
globals.siteNameAttribute = "Site"
globals.popups = [];
globals.layers = [];
globals.jsonResponse;
globals.keyList = []
globals.ages = [22000, 21000,20000,19000, 18000,17000,16000,15000,14000,13000,12000,11000,10000,9000,8000,7000,6000,5000,4000,3000,2000,1000, 100] //hard coded :( --> don't know how to get around this at this time.
globals.diagram = {}
globals.diagram.margins = {
	top: 20,
	right:20,
	bottom: 100,
	left: 50
}
globals.currentTime = 22000; //current age of the view
globals.diagramTimeLine;
globals.diagram.lines = {}


/////////////////////////////////
$(document).ready(function(){
	//gets called on the page init
	console.log("Running main.js")
	//make the map
	createMap()
	//load the points
	loadPoints()
})

/////////////////////////////////

function createMap(){
		//create a map
	globals.map = L.map('map').setView([40.82, -122.2], 4);
	//add some tiles
	var mapTiles = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/{type}/{z}/{x}/{y}.{ext}', {
	type: 'sat',
	ext: 'jpg',
	subdomains: '1234'
});
	mapTiles.addTo(globals.map) //this adds it to the map
}

function loadPoints(){
	$.ajax("assets/data/pinus_contorta.geojson", {
		success: function(response){
			console.log(response);
			//add it to the map
			layer = L.geoJson(response, { // this adds the geojson to the map
				pointToLayer: function (feature, latlng) { //makes polygon instead of default point icons which look bad.
					//first create the proportional symbols
					attVal = feature.properties[globals.defaultAttribute] //this is the default value for name of the attribute
					 r = calcSymbolRadius(attVal); //set the appropriate radius
					 geojsonMarkerOptions.radius = r //set the radius in the options --> done with prop symbols now
					 //add popups on click
					 var displayVal = Math.round(attVal * 100) / 100
					 var siteName = feature.properties[globals.siteNameAttribute] // get the site name
					 var popupContent = "<div><b>Site Name: </b><span class='text-muted'>" + siteName + "</span><br /><b>Time Slice Value: </b><span class='text-muted'>" + displayVal + "%</span>"
        			 circle =  L.circleMarker(latlng, geojsonMarkerOptions)
        			 circle.bindPopup(popupContent)
        			 circle
        			 circle.on({
        			 	click: function(){
        			 		symbolClick(this)
        			 	},
        			 	mouseover: function(){
        			 		this.openPopup();
        			 	},
        			 	mouseout: function(){
        			 		this.closePopup();
        			 	}
        			 })
        			 return circle
        			 }
			}).addTo(globals.map)
			globals.layers.push(layer)
			//figure out how many timesteps we have
			keyList = Object.keys(response.features[0].properties);
			
			globals.keyList = keyList;
			//remove those elements that are not timeslices
			i = globals.keyList.indexOf("Site")
			globals.keyList.splice(i, 1)
			//this facilitates lookups by attribute
			numKeys = keyList.length; 
			console.log(globals.keyList)
			createSliderWidget(numKeys); 
			globals.jsonResponse = response;
			console.log(globals.jsonResponse)
			setView() // this sets the view based on the mean coordinates of the data
			drawDiagram();
		}, //end success method
		dataType: "json",
		error: function(error){
			console.log(error);
		},
		beforeSend: function(){
			console.log("Getting data.")
		}
	})
}


function calcSymbolRadius(val){
	//calculate the correct symbol radius for the symbol, given a value
	var scaleFactor = 50;
	var area = Number(val) * scaleFactor; //cast to number
	var radius = Math.sqrt(area/Math.PI);
	return radius
}


var geojsonMarkerOptions = {
	//geojson point styling
    radius: 8,
    fillColor: "steelblue",
    fillOpacity: 0.8
};


function symbolClick(e){
	//called when the symbol is clicked
	feature = e.feature
	var name = feature.properties.Site
	$("#siteName").text(name)
	var coords = feature.geometry.coordinates
	var lat = coords[1]
	var lng = coords[0]
	$("#siteCoords").text(lat + "N " + lng + "W")
	//work on the diagram
	values = []
	for (item in feature.properties){
		if (item != "Site"){
			val = feature.properties[item]
			values.push(val)
		}
	}
	globals.map.eachLayer(function(layer){
		//sets the color to blue on click
		if (layer.feature){
			var props = layer.feature.properties;
			var siteName = props[globals.siteNameAttribute]
			if (siteName == name){
				color = 'red'
			}else{
				color = 'steelblue'
			}
			layer.setStyle({'fillColor': color})
		}
	})
	changeLineOnSymbolClick(name); //changes the diagram panel to reflect click
}

function drawDiagram(){
	//draws the pollen diagram
	console.log("Drawing response.")
	$("#diagram").empty(); //get rid of everything currently in there
	//margins are already set
	//set the width and height
	var width = $("#detailsPanel").width() - globals.diagram.margins.left - globals.diagram.margins.right
	console.log(width)
	var height = $("#detailsPanel").height() -  globals.diagram.margins.top - globals.diagram.margins.bottom;
	
	globals.diagram.width = width
	globals.diagram.height = height
	
	allVals = [];
	maxVal = 0
	//get everything in the right format
	for (feature in globals.jsonResponse.features){
		taxonVals = globals.jsonResponse.features[feature].properties
		site = taxonVals['Site']
		//lineVals = [{'value':0, 't': 22001}] //add beginning point
		lineVals = []
		for(var i =0; i<Object.keys(taxonVals).length; i++){
			key = Object.keys(taxonVals)[i]
			value = taxonVals[key]
			age = +globals.ages[i]
			if ((age != NaN) && (value != NaN) && (key != "Site")){
				if (+value > maxVal){
					maxVal = +value
				}
				lineVals.push({'value' : +value, 't': +age, 'Site': site})
			}
			
		}
		//lineVals.push({'value' : 0, 't': -1}); //and end to facilitate filling
		allVals.push(lineVals)
	}

	
	//set the scaling
	var timeScale = d3.scale.linear()
		.range([0, height])
	var valScale = d3.scale.linear()
		.range([0, width])
		
		//finish mapping values to points
	timeScale.domain(d3.extent(globals.ages))
	valScale.domain([0, maxVal])
	
	globals.diagram.valScale = valScale
	globals.diagram.timeScale = timeScale
		
	//create the axes
	var xAxis = d3.svg.axis()
		.scale(valScale)
		.orient('bottom')
	
	var yAxis = d3.svg.axis()
		.scale(timeScale)
		.orient('left')
		.ticks(10)
	//set up the path function --> scale the values into the diagram constraints
	var line = d3.svg.line()
	.interpolate("monotone")
		.x(function(d){ 
			return +valScale(d.value)})
		.y(function(d){
			return +timeScale(+d.t)})
	
	//this is the svg canvas
	var svg = d3.select("#diagram").append("svg")
	.attr('height', height + globals.diagram.margins.top + globals.diagram.margins.bottom)
	.attr('width', width + globals.diagram.margins.left + globals.diagram.margins.right)
	.append('g')
		.attr('transform', 'translate(' + globals.diagram.margins.left + "," + globals.diagram.margins.top + ")")
		
	var div = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0)
    .append('text')


 	//draw the path	
 	for (l in allVals){
 		lineVals = allVals[l]
 		site = lineVals[0]['Site']
 		thisLine = svg.append('path')
		.datum(lineVals)
		.attr('class', 'line')
		.attr('d', line)
		.style('opacity', 0.2)
		.style('stroke-width', 3)
		.attr('sitename', site)
		.on('click', function(){
			//make all the others more transparent
			for (otherLine in globals.diagram.lines){
				 p = globals.diagram.lines[otherLine]
				 p.style("opacity", 0.2)
				 p.style('stroke', 'steelblue')
			}
			//make this one full opaque
			thisLine = d3.select(this)
			thisLine.style('opacity', 1)
			thisName = thisLine.attr('sitename')
			updateMapSymbolsOnLineClick(thisName)
			thisLine.style('stroke', 'red')
			})
		.on('dblclick', function(){
			//zooms to point on line doubleclick
			thisLine = d3.select(this)
			thisName = thisLine.attr('sitename')
			for (feature in globals.jsonResponse.features){
				site = globals.jsonResponse.features[feature].properties['Site']
				if (site == thisName){
					coords = globals.jsonResponse.features[feature].geometry.coordinates
					console.log(coords)
					inverseCoords = [coords[1], coords[0]]
					globals.map.setView(inverseCoords, 6)
				}
			}
		})
		.on('mouseover', function(){
			thisLine = d3.select(this)
			thisName = thisLine.attr('sitename')
			console.log(thisName)
			var mouseCoords = d3.mouse(this)
			div.text(thisName)
			div.attr('x', mouseCoords[0])
			div.attr('y', mouseCoords[1])
		})
		globals.diagram.lines[site] = thisLine
 	}
 	

		
	//add a line to depict the current time view
	globals.diagramTimeLine = svg.append('line')
		.attr('x1', 0)
		.attr('x2', width)
		.attr('y1', timeScale(globals.currentTime))
		.attr('y2', timeScale(globals.currentTime))
		.attr('stroke', 'red')
		//setup the axes
	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ")")
		.call(xAxis)
	
	svg.append('g')
		.attr('class', 'y axis')
		.call(yAxis)
		.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', 6)
			.attr('dy', '-.71em')
			.text("Years B.P.")
			.style('text-anchor', 'end')
}

function changeLineOnSymbolClick(site){
	//this changes the line opacity when a prop symbol is clicked
	for (otherLine in globals.diagram.lines){
		 p = globals.diagram.lines[otherLine]
		 p.style("opacity", 0.2)
		
	}
	globals.diagram.lines[site].style('opacity', 1)
	//make all the others more transparent
}

function createSliderWidget(numSteps){
	//this creates the top slider bar
	//todo: replace with pollen slider
	html = "<div class='row col-sm-12' id='timeControlHolder'><b>Time Controls: <br />"
	html += "<button><span class='glyphicon glyphicon glyphicon-backward' id='backward'></span></button>"
	html += '<input id="timeControl" type="range">'
	html += "<button><span class='glyphicon glyphicon glyphicon-forward' id='forward'></span></button>"
	html += "</div>"
	$("#controls").append(html)
	
    //set slider attributes
    $('#timeControl').attr({
        max: numSteps -1,
        min: 0,
        value: 0,
        step: 1
    });
    
    $("#timeControl").change(controlSlider)
    $("#forward").click(nextTime);
    $("#backward").click(prevTime)
}

function nextTime(){
	//advance to next time on button click
	val = +$("#timeControl").val() + 1;
	if (val > globals.keyList.length - 1){
		val = globals.keyList.length - 1 // zero index
		return
	}
	console.log(val)
	$("#timeControl").val(val)
	attr = globals.keyList[val]
	console.log(attr)
	updatePropSymbols(globals.map, attr)
	updateTimeSliceLabel(attr)
	globals.currentTime = globals.ages[val]
	updateDiagramTimeline()
}

function prevTime(){
	//advance to previous time on button click
	val = +$("#timeControl").val() - 1;
	if (val < 0){
		val = 0
		return
	}
	$("#timeControl").val(val)
	attr = globals.keyList[val]
	updatePropSymbols(globals.map, attr)
	updateTimeSliceLabel(attr)
	globals.currentTime
	globals.currentTime = globals.ages[val]
	updateDiagramTimeline()
	
}

function updateTimeSliceLabel(val){
	//changes the time period label
	$("#timesliceLabel").text(val)
}

function updateDiagramTimeline(){
	//changes the line reflecting current time slice on the pollen diagram pane;
	globals.diagramTimeLine
		.attr('y1',globals.diagram.timeScale(globals.currentTime))
		.attr('y2', globals.diagram.timeScale(globals.currentTime))	
		.attr('x1', 0)
		.attr('x2', globals.diagram.width)
}

function controlSlider(){
	//advance on time slider change
	val = $("#timeControl").val()
	attr = globals.keyList[val] // this is the attribute we want
	console.log(attr)
	updatePropSymbols(globals.map, attr)
	globals.currentTime = globals.ages[val]
	updateDiagramTimeline()
}

function setView(){
	//get the arithmetic mean of the points and set the view so that we see all points at once
	runningLat = 0
	runningLng = 0
	num = 0
	index = 0
	features = globals.jsonResponse.features
	while (index < features.length){
		item = features[index]
		var lat = +item.geometry.coordinates[0]
		var lng = +item.geometry.coordinates[1]
		runningLat += lat
		runningLng += lng
		num += 1
		index += 1
	}
	var meanLat = runningLat / num
	var meanLng = runningLng / num
	
	globals.map.setView([meanLng, meanLat])
}

function updateMapSymbolsOnLineClick(site){
	//this changes the appearance of the proportional symbols when a pollen time series is clicked
	map = globals.map
	    map.eachLayer(function(layer){
        if (layer.feature){

             //access feature properties
            var props = layer.feature.properties;
            var siteName = props[globals.siteNameAttribute] // get the site name
            if (siteName == site){
            	color = 'red';
            }else{
            	color = 'steelblue'
            }
            layer.setStyle({'fillColor':color});
            layer.bringToFront();
			
        };
     });
}

function updatePropSymbols(map, attribute){
	//this changes the proportional symbol radii and popups
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;
            //update each feature's radius based on new attribute values
            attVal = props[attribute]
            var radius = calcSymbolRadius(attVal);
            layer.setRadius(radius);

           	//add popups on click
			var displayVal = Math.round(attVal * 100) / 100
			var siteName = props[globals.siteNameAttribute] // get the site name
			var popupContent = "<div><b>Site Name: </b><span class='text-muted'>" + siteName + "</span><br /><b>Time Slice Value: </b><span class='text-muted'>" + displayVal + "%</span>"
 		
            //replace the layer popup
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius)
            });
        };
    });
};

// function loadData(name){
	// url = "http://api.neotomadb.org/v1/data/"
	// $.ajax("")
// }

//load the list of available taxa
dropdownOptions = []
$.ajax("assets/data/listfile.csv", {
	success: function(response){
		response = response.split(",")
		for (item in response){
			name = response[item]
			if (name != "" || name !=","){
				dropdownOptions.push(response[item]);
			}
			
		}
		//make the autocomplete
		console.log(dropdownOptions)
		$("#taxonSearch").autocomplete({
			source: dropdownOptions
		})
	}
})

function loadDataset(name){
	url = "assets/data/geojson/" + name
	console.log(url)
	$.ajax(url, {
		success: function(response){
			console.log(response)
		},
		error: function(){
			console.log("ERROR!!!!")
		}
	})
}


