/*TODO:
 * 2. Rank behavior
 * 3. horizontal filter
 * 4. Styling of panel
 * 8. sealevel overlay
 * 10. Intro
 */

//global behaviors
var drag = d3.behavior.drag();
$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});


//global variables
var globals = {};
globals.Map = {};
globals.diagram = {};
globals.taxonData;
globals.taxonName;
globals.geojsonFile;//stores the location of the current geojson object
//globals.defaultGeojson = "assets/data/pinus_contorta.geojson" // debugging only
globals.defaultAttribute = "1000-present"
globals.currentTime = 0
globals.diagram.margins = {
	top: 75,
	right:20,
	bottom: 50,
	left: 50
}
globals.ages = [23000, 22000, 21000, 20000,19000, 18000,17000,16000,15000,14000,13000,12000,11000,10000,9000,8000,7000,6000,5000,4000,3000,2000,1000, 0] //hard coded :( --> don't know how to get around this at this time.
globals.diagram.lines = {}
globals.colors = {}
globals.colors.blue = "#33757a"
globals.colors.red = "#421313"
globals.symbolMultiplier = 50
globals.legend = {}
globals.legend.legendValues = [5, 10, 20]
globals.taxonType;
globals.taxonomy = {}
globals.taxonomy.itisSkip = 0//how many itis records to skip to make sure we find a taxon in the correct kingdom
globals.icesheetsData;
globals.displayIcesheets = false;


//ice sheet data display options

iceOptions = {
	opacity: 0.7,
	fillColor: 'white',
	fillOpacity: 0.75,
	color: 'gray'
}
inactiveIceOptions = {
	opacity: 0,
	fillColor: 'red',
	fillOpacity: 0,
}

//set the value of the slider to the current multiplier for symbol size
$("#symbolSizeInput").val(globals.symbolMultiplier)

var geojsonMarkerOptions = {
	//geojson point styling
    radius: 2,
    fillColor: globals.colors.blue,
    fillOpacity: 0.5,
    opacity: 0.5,
    color: "black"
};



	$(document).ready(function(){
		//enter press to search
        $(document).bind('keypress', function(e) {
            if(e.keyCode==13){
                 $('#search').trigger('click');
             }
        });
		//loads the list of data files available
		$.ajax("assets/data/listfile.csv",{
			success: loadSpeciesList
		})

		//click fires the event to get data from the server
		//////////////////////////////////////////////////////////
		//////////////////////////////////////////////////////////
		$("#search").click(function(){ //FIFTH INTERACTION OPERATOR
			name = $("#taxonSearch").val();
			loadSpeciesData(name)
		})
		//////////////////////////////////////////////////////////
		//////////////////////////////////////////////////////////

		//initialize the map
		initMap();


		//open model on program start if not already dismissed
		$('#startModal').modal('show')

		//bind exploration click events
		$("#explore1").click(function(){
			loadSpeciesData("Bison Bison")
			$("#startModal").modal("hide")
			$("#taxonSearch").val("Bison Bison")
			globals.currentTime = 0
		})

		$("#explore2").click(function(){
			loadSpeciesData("Picea")
			$("#startModal").modal("hide")
			$("#taxonSearch").val("Picea")
			globals.currentTime = 12000
			globals.defaultAttribute = "13000-12000"
		})


		$("#explore3").click(function(){
			loadSpeciesData("Cyperace")
			$("#startModal").modal("hide")
			$("#taxonSearch").val("Cyperace")
			globals.currentTime = 2000
			globals.defaultAttribute = "2000-1000"
		})
		//load ice sheet data here because it takes a hot minute
		loadIceSheetData();


	})


	function loadSpeciesList(response){
		//called when species list is returned
		//handles autocomplete
				listing = response.split(",")
				culledListing = []
				listing.forEach(function(item){
					item = item.replace("  ", "")
					item = item.replace('"', "")
					if (item != '"'){
						culledListing.push(item)
					}

				})

				$('#taxonSearch').typeahead({
					  hint: true,
					  highlight: true,
					  minLength: 1
					},
					{
					  name: 'Taxa',
					  source: substringMatcher(culledListing)
					});
			}

	function loadSpeciesData(name){
		fName = name.replace(" ", "_")
    fName = fName.toUpperCase()
		fName = fName + ".geojson"
    console.log(fName);
		file = "/assets/data/geojson/" + fName
		//file = globals.defaultGeojson
    console.log(file)
		$.ajax(file, {
			//dataType: "json",
			success: function(response){
				response = JSON.parse(response)
				globals.taxonData = response //this is the geojson
				globals.taxonName = name
				clear() // clears any previous searches
				addGeojsonToMap(); //this adds the circles
				drawDiagram(); // this draws the pollen diagram
				setViewForTaxon(); //this zooms to the map to the appropriate bounding box
				updateTaxonMetadataPanel(); //this updates the taxonomy, etc on the panel
				getTaxonPicture() //this gets the picture from phylopic
				//getTaxonInfo(); //gets taxonomy and common names from ITIS
				createLegend() // creates a d3 legend
				initializeLegendChange(); //allows for resymbolization
				globals.geojsonFile = file //facilitates dataset download
				addIceSheetData() //add the overlay as invisible
				changeTimeslice() //enables popovers and scales the values --> must come after legend creation and map symbol creation
				showIceSheets(globals.currentTime)
				updateLegend() //makes sure the legend is correct when transitioning between species
        console.log("End of succes function.")
			}, error: function(xhr, status, error){
				console.log("Couldn't get geojson")
				console.log(xhr.responseText)
		}, beforeSend: function(){
			}
		})
	}

	function initMap(){
				//create a map
	globals.map = L.map('map', { zoomControl:false }).setView([40.82, -122.2], 4);
		//add some tiles
		var mapTiles = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/{type}/{z}/{x}/{y}.{ext}', {
		type: 'sat',
		ext: 'jpg',
		subdomains: '1234'
	});
	mapTiles.addTo(globals.map) //this adds it to the map



	//add a container because the lab says to
	var legendControl = L.Control.extend({
		options: {
			position: "bottomleft"
		},
		onAdd: function(){
			var container = L.DomUtil.create("div", 'legend-container');
			html = "<div id='controlHeader' align='center'><h4 id='speciesHeader'></h4><br /><h5 id='currentTime' ></h5><br />"

			html += "</div><br />"
			html += "<input type='range' min='0' max='100' step='1'id='symbolSizeInput' data-toggle='tooltip' title='Resize Proportional Symbols'/>"
			html += "<div id='legend' class='col-xs-6'></div> <br />"
			$(container).append(html)
			//kill any mouse event listeners on the map
            $(container).on('mousedown dblclick mousewheel', function(e){
                L.DomEvent.stopPropagation(e);
            });
            console.log(container)
			return container;
		}
	})
	globals.map.addControl(new legendControl())

	var mapControls = L.Control.extend({
		option: {
			position: "topright"
		},
		onAdd: function(){
			console.log("adding map controls.")
			var container = L.DomUtil.create("div", "control-container")
			html = "<div id='mapControls'>"
			html += "<h6 align='center' id='control-label'>Map Controls</h6><br/>"
			html += "<input type='checkbox' id='icesheetsInput' name='icesheets'/>"
			html += "<label style='display:inline; font-weight: 500' for='icesheets'>Overlay Icesheets</label><br />"
			html += "<span id='download' class='glyphicon glyphicon-download'></span>"
			html += "<span id='clearMap' class='glyphicon glyphicon-remove'></span>"
			html += "</div>"
			$(container).append(html)
			$(container).on('mousedown dblclick mousewheel', function(e){
			L.DomEvent.stopPropagation(e)})

			$(container).css({'opacity':0.25})

			//event handlers --> here because of onAdd
			$(container).mouseover(function(){
				$(this).css({'opacity': 1, 'height': '70px'})
			})
			$(container).mouseout(function(){
				$(this).css({'opacity': 0.25, 'height': '55px'})
			})

			//split apart the container to facilitate events
			mainDiv = $(container).children()[0]
			mainDivElements = $(mainDiv).children()//array of dom elements
			iceCheck = mainDivElements[2] //checkbox for overlay
			iceCheckLabel = mainDivElements[3]
			clearMap = mainDivElements[6]
			downloadMap = mainDivElements[5]

			$(clearMap).css({'font-size': '15px'})
			$(downloadMap).css({'font-size': '15px'})
			$(iceCheckLabel).css({'font-size': '12px'})
			$(iceCheck).prop('checked', true)

			//click events
			$(clearMap).click(function(){
				clear()
			})
			$(downloadMap).click(function(){
				getDownload();
			})
			//clear map style events
			$(clearMap).mouseover(function(){
				$(this).css({'font-size': '25px', 'color': globals.colors.red})
			})
			$(clearMap).mouseout(function(){
				$(this).css({'font-size': '15px', 'color': 'black'})
			})

			//download map style events
			$(downloadMap).mouseover(function(){
				$(this).css({'font-size': '25px', 'color': 'green'})
			})
			$(downloadMap).mouseout(function(){
				$(this).css({'font-size': '15px', 'color': 'black'})
			})



			//ice overlay events
			$(iceCheck).change(function(){
				isChecked = $(this).prop("checked")
				globals.displayIcesheets = isChecked
				if (isChecked){
					showIceSheets(globals.currentTime);
				}
				if (!isChecked){
					hideIceSheets();
				}
			})

			return container
		}
	})
	globals.map.addControl(new mapControls())

} //end of init map function

function setViewForTaxon(){
	//zoom to layer a la ArcMap
	return
}

function updateTaxonMetadataPanel(){
	//updates the taxon info on the right side
	$("#speciesName").text(globals.taxonName)
	$("#speciesHeader").text(globals.taxonName)

}

function addGeojsonToMap(){
	layer = L.geoJson(globals.taxonData, { // this adds the geojson to the map
		pointToLayer: function (feature, latlng) { //makes polygon instead of default point icons which look bad.
			// //first create the proportional symbols
			// attVal = feature.properties[globals.defaultAttribute] //this is the default value for name of the attribute
			 // r = calcSymbolRadius(attVal); //set the appropriate radius
			 // geojsonMarkerOptions.radius = r //set the radius in the options --> done with prop symbols now

			 displayVal = Math.round(feature.properties[globals.defaultAttribute] / 100) * 100
			console.log(feature.properties[globals.defaultAttribute] )
			 circle =  L.circleMarker(latlng, geojsonMarkerOptions)
			 globals.taxonType = feature.properties.Type
			var popupContent = "<div><b>Site Name: </b><span class='text-muted'>" + feature.properties.Site + "</span><br /><b>Time Slice Value: </b><span class='text-muted'>" + displayVal + "%</span>"
			 circle.bindPopup(popupContent)
			 circle.on({
			 	click: function(e){
			 		symbolClick(e.target.feature.properties.Site)
			 	},
			 	// mouseover: function(){
			 		// this.openPopup();
			 	// },
			 	// mouseout: function(){
			 		// this.closePopup();
			 	// }
			 })
			 return circle
			 }
	}).addTo(globals.map)


}
function drawDiagram(){
//draws the pollen diagram
$("#diagram").empty(); //get rid of everything currently in there
//set the width and height
var width = $("#detailsPanel").width() - globals.diagram.margins.left - globals.diagram.margins.right
var height = $("#detailsPanel").height()*.85 -  globals.diagram.margins.top - globals.diagram.margins.bottom;

globals.diagram.width = width
globals.diagram.height = height

allVals = [];
maxVal = 0
maxAge = 0
//get everything in the right format
for (feature in globals.taxonData.features){
	taxonVals = globals.taxonData.features[feature].properties
	site = taxonVals['Site']
//lineVals = [{'value':0, 't': 22001}] //add beginning point
lineVals = []
l = Object.keys(taxonVals).length
for(var i =0; i< l; i++){
	key = Object.keys(taxonVals)[i]
	if (key == "Site" || key == "Type"){
		//pass
	}else{
		value = taxonVals[key]
		age = +globals.ages[i]
		if ((age != NaN) && (value != NaN) && (key != "Site") && (key != "Type")){
			if (+value > maxVal){
				maxVal = +value
			}
			if (+age > maxAge){
				maxAge = age
			}
			lineVals.push({'value' : +value, 't': +age, 'Site': site})
		}
	}

}
//lineVals.push({'value' : 0, 't': -1}); //and end to facilitate filling
	allVals.push(lineVals)
}
globals.maxVal = maxVal



//set the scaling
var timeScale = d3.scale.linear()
	.range([0, height])
var valScale = d3.scale.linear()
	.range([0, width - 25])

	//finish mapping values to points
timeScale.domain([0, maxAge])
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
//.interpolate("monotone")
.x(function(d){
	return +valScale(+d.value)})
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
.on('click', function(e){
	thisName = d3.select(this).attr('sitename')
	for (line in globals.diagram.lines){
		globals.diagram.lines[line].style('opacity', 0.2)
		globals.diagram.lines[line].style('stroke', globals.colors.blue)
	}
	d3.select(this).style('stroke', globals.colors.red).style('opacity', 1)
	updateSymbol(thisName)
	updateSiteInformationPanel(thisName)
	})
.on('dblclick', function(){
	//zooms to point on line doubleclick
	thisLine = d3.select(this)
	thisName = thisLine.attr('sitename')
	for (feature in globals.taxonData.features){
		site = globals.taxonData.features[feature].properties['Site']
		if (site == thisName){
			coords = globals.taxonData.features[feature].geometry.coordinates
			inverseCoords = [coords[1], coords[0]]
			globals.map.setView(inverseCoords, 6)
		}
	}
})
.on('mouseover', function(){
	// thisLine = d3.select(this)
	// thisName = thisLine.attr('sitename')
	// console.log(thisName)
	// var mouseCoords = d3.mouse(this)
	// div.text(thisName)
	// div.attr('x', mouseCoords[0])
	// div.attr('y', mouseCoords[1])
	})
	globals.diagram.lines[site] = thisLine
}



//add a line to depict the current time view
 globals.diagram.timelineFunction = d3.svg.line()
    .x(function(d) {
      return d.x;
    })
    .y(function(d) {
    	if (d.y > globals.diagram.height){
    		return globals.diagram.height
    	}
    	if (d.y < 0){
    		return 0
    	}
      return d.y;
    })
    .interpolate("linear");

 var data = [{
    "x": 0,
"y": timeScale(globals.currentTime)
  }, {
    "x": width,
"y": timeScale(globals.currentTime)
  }];




	//setup the axes
svg.append('g')
.attr('class', 'x axis')
.attr('transform', 'translate(0,' + height + ")")
	.call(xAxis)

svg.append('g')
.attr('class', 'y axis')
.call(yAxis)
.append('text')
	.attr('transform', 'rotate(-45)')
	.attr('y', -10)
	.text("Years B.P.")
	.style('text-anchor', 'begin')

//this is the time slider
globals.diagram.timeLine = svg.append("path")
	.attr("d", globals.diagram.timelineFunction(data))
	.attr("stroke", "red")
	.attr("stroke-width", 10)
	.attr('opacity', 0.3)
	.attr("fill", "red")
	.attr('class', 'draggable')
	    .call(drag)

   //add some extra labels for context
	xlabel = svg.append('text')
		.attr('x', 0)
		.attr('y', height + 35)

	if (globals.taxonType == "Pollen"){
		xlabel.text("Relative Abundance")
	}else if (globals.taxonType == "Mammals"){
		xlabel.text("Dated Individuals")
	}

	timelabel1 = svg.append('text')
		.attr('x', width-25)
		.attr('y', timeScale(19000))
		.attr('transform', 'rotate(-90 ' + (width - 20) + "," + timeScale(19000) + ')')
		.attr('text-anchor', 'begin')
		.text("Deglaciation")
	timelabel2 = svg.append('text')
		.attr('x', width-25)
		.attr('y', timeScale(11700))
		.attr('transform', 'rotate(-90 ' + (width - 20) + "," + timeScale(11700) + ')')
		.attr('text-anchor', 'begin')
		.text("Holocene")

} //end draw diagram

var drag = d3.behavior.drag().on('drag', dragmove);
function dragmove() {
	//this is the dragging on the timeline slider
    isDown = false;
    m3 = d3.mouse(this);
	var newArray = [ {x: 0, y: m3[1]},
             {x: globals.diagram.width, y: m3[1]} ];
    globals.diagram.timeLine.attr('d', globals.diagram.timelineFunction(newArray));
   	//this is the current timeslice
   	globals.currentTime = globals.diagram.timeScale.invert(+m3[1])
   	if (globals.currentTime < 0){
   		globals.currentTime = 0
   	}
   	if (globals.currentTime > d3.max(globals.ages)){
   		globals.currentTime = d3.max(globals.ages)
   	}
    changeTimeslice()
}


function getTaxonInfo(){
		//use the itis.gov service for taxonomy
		URI = "http://www.itis.gov/ITISWebService/jsonservice/searchForAnyMatch?jsonp=?"
		$.ajax(URI, {
			cache: true,
			type: "POST",
			crossDomain: true,
			dataType: "jsonp",
			data: {"srchKey" : globals.taxonName},
			success: function(response){
				matchList = response['anyMatchList']
				if (matchList != null){
					firstItem = matchList[globals.taxonomy.itisSkip]
					commonNamesList = firstItem['commonNameList']['commonNames']
					for (cn in commonNamesList){
						common = commonNamesList[cn]
						if (common['language'] == "English"){
							name = common['commonName']
							$("#commonNameList").append("<li class='list-group-item text-muted'>" + name + "</li>")
						}
					}
					$("#reference").text(firstItem['author'])
					globals.tsn = firstItem['tsn'] // this is the itis id
					getTaxonParent(globals.tsn)

				}

			},
			error: function(xhr, status, error){
				console.log(xhr.responseText)
				console.log(error)
			}, beforeSend: function(){
				console.log("Sending to " + this.url)
			}

		})
	}
function getTaxonParent(itis){
	$("#taxonomy").empty()
	URI = "http://www.itis.gov/ITISWebService/jsonservice/getFullHierarchyFromTSN?jsonp=?"
	$.ajax(URI, {
			cache: true,
			type: "POST",
			crossDomain: true,
			dataType: "json",
			data: {"tsn": itis},
			success: function(response){
				altName = false
				console.log("Got hierarchy response from itis ")
				taxList = response['hierarchyList']
				if (taxList.length == 0 || taxList.length == 1){
					$("#taxonomy").append("<p>Could not establish taxonomic hierarchy for this grouping.</p>")
				}else{
					taxonomyHTML = []
					for (item in taxList){
						taxon = taxList[item]
						taxRank = taxon['rankName']
						taxName = taxon['taxonName']
						taxonomyHTML.push("<li class='list-group-item'><span class='strong'>" + taxRank + "</span> <span class='text-muted'>" + taxName + "</span></li>")
						if (taxRank == "Kingdom"){
							//check if we got an animal hierarchy instead of the plant hierarchy --> usually happens with the pollen records
							if ((taxName == "Animalia" && globals.taxonType == "Pollen") ||(taxName == "Plantae" && globals.taxonType == "Mammals") ){
								//not the correct one
								altName = true
							}
						}
						//TODO: this causes errors???
					}
					if (!altName){
					for (i in taxonomyHTML){
						$("#taxonomy").append(taxonomyHTML[i])
					}
					}else{
						$("#taxonomy").append("Oops... Found the Animalia taxonomy instead of the Plantae taxonomy.")
					}
				}
			}, error: function(xhr, status, error){
				console.log(xhr.responseText)
				console.log(error)
			}
	}) //end ajax
}

function getTaxonPicture(){
	return
	// //make api call to get identifying string
	// URIName = encodeURIComponent(globals.taxonName)
//
	// URI = "http://phylopic.org/api/a/name/search?text=" + URIName
	// $.ajax(URI, { // this gets the uid for the species
		// success: function(response){
			// if (response['success']){
				// data = response['result']
				// uid = data[0]['canonicalName']['uid']
				// globals.taxonUID = uid
				// getPictureLocation(uid)
			// }
		// }, error: function(error){
			// console.log(error)
		// },
		// dataType: "json"
//
	// })
	// function getPictureLocation(uid){
		// URI = "http://phylopic.org/api/a/name/" + uid + "/images?options=credit+svgFile+canonicalName"
		// $.ajax(URI, {
			// success: function(response){
				// if (response['success']){
					// result = response['result']
					// picFound = false
					// //check if the response returned a svgFile for us to use
					// samePics = result['same']
					// for (pic in samePics){ //listed as the same taxa
						// if (samePics[pic]['svgFile'] != null){
							// pic = samePics[pic]['svgFile']['url']
							// picFound = true
							// break
						// }
					// }
					// if (!picFound){ // look for higher taxa
						// for (pic in result['supertaxa']){
							// thisPic = result['supertaxa'][pic]
							// if (thisPic['svgFile'] != null){
								// picFound = true
								// pic = thisPic['svgFile']['url']
								// break
							// }
						// }
//
					// }
					// if (!picFound){ // look in a couple other places
						// for (pic in result['other']){
//
							// thisPic = result['other'][pic]
							// if (thisPic['svgFile'] != null){
								// picFound = true
								// pic = thisPic['svgFile']['url']
								// break
							// }
						// }
//
					// }
			// if (!picFound){ // try other formats (png)
						// for (pic in result['same']){
							// thisPic = result['same'][pic]
							// if (thisPic['pngFile'] != null){
								// picFound = true
								// pic = thisPic['pngFile']['url']
								// break
							// }
						// }
					// }
			// if (!picFound){ // try other formats (png)
						// for (pic in result['supertaxa']){
							// thisPic = result['supertaxa'][pic]
							// if (thisPic['pngFile'] != null){
								// picFound = true
								// pic = thisPic['pngFile']['url']
								// break
							// }
						// }
					// }
//
					// if (!picFound){ //if we get to this point, we've exhausted all of our other options
						// $("#pic").html("<p>Couldn't find a suitable picture.</p>")
						// console.log("Couldn't find picture")
					// }else{
						// //get the first picture listed
						// setPicture(pic)
					// }
//
				// }
			// },
			// error: function(error){
				// console.log(error);
			// }
		// })
	// function setPicture(pic){
		// URI = "http://phylopic.org" + pic //this is where the picture is on the phylopic server
		// $("#pic").attr('src', URI) //set the picture in our HTML
	// } //end setPicture
	// }//end getPictureLocation
}//end getTaxonPicture()


function updateSiteInformationPanel(site){
	function getSiteFromNeotoma(site){
		URI = "http://api.neotomadb.org/v1/data/sites"
		//find the bounding box to make sure we get the right site from neotomadb
		for (f in globals.taxonData.features){
			loc = globals.taxonData.features[f].properties.Site
			if (site == loc){
				coords = globals.taxonData.features[f].geometry.coordinates
				lat = coords[1]
				lng = coords[0]
				latN = lat + 5
				latS = lat - 5
				lngW = lng - 5
				lngE = lng + 5
				s = lngW + "," + latS + "," + lngE + "," + latN
				break
			}
		}
		$.ajax(URI, {
			data: {
				sitename : site.substring(0, 5) + "%",
				loc: lngW + "," + latS + "," + lngE + "," + latN
			},
			crossDomain: true,
			type: "POST",
			cache: true,
			dataType: "jsonp",
			success: function(response){
				console.log("Got neotoma Return")
				if (response['success']){
					console.log(response)
					sites = response['data']
					thisSite = sites[0]
					//update the html
					$("#siteName").text(thisSite['SiteName'])
					$("#siteDesc").text(thisSite['SiteDescription'])
					$("#siteLat").text(latN)
					$("#siteLng").text(lngW)
					$("#siteID").text(thisSite['SiteID'])

				}else{
					console.log("Couldn't get data from neotoma")
				}
			},
			error: function(xhr, status, error){
				console.log(status)
				console.log(error)
			},
			beforeSend: function(){
				console.log(this.url)
			}
		})
	}

	getSiteFromNeotoma(site)

	//get more contextual information
	minYear = getMinYear(site)
	maxYear = getMaxYear(site)
	rank = getRankInTimeslice(site)
	$("#minYear").text(maxYear) //this is backwards because of the mixing conventions --> is most recent min or max?  works for now.
	$("#maxYear").text(minYear)
	$("#rank").text(rank)
}

function updateLine(site){

	for (line in globals.diagram.lines){
		thisLine = globals.diagram.lines[line];
		thisLine.style('opacity', 0.2)
		thisLine.style('stroke', globals.colors.blue)
	}
	theLine = globals.diagram.lines[site]
	theLine.style('opacity', 1)
	theLine.style('stroke', globals.colors.red)
}

function symbolClick(e){
	updateSiteInformationPanel(e) //get information from neotoma and put it in the panel
	updateLine(e)
	updateSymbol(e)
}


function updateSymbol(site){
	globals.map.eachLayer(function (layer, feature){
		if (layer.feature){
			if (layer.feature.properties.Age > 0){
				layer.bringToBack()
				//pass ice data
			}else{
				if (layer.feature.properties.Site == site){
					layer.bringToFront(); // not sure if this is working?
					layer.setStyle({'fillColor': globals.colors.red, "fillOpacity": 0.5})
					layer.openPopup()
				}else{
					layer.setStyle({'fillColor' : globals.colors.blue, "fillOpacity": 0.5})
					layer.bringToBack()
				}
		}
		}
	})
}



function calcSymbolRadius(val){
	//calculate the correct symbol radius for the symbol, given a value
	var scaleFactor = globals.symbolMultiplier;
	var area = Number(val) * scaleFactor; //cast to number
	var radius = Math.sqrt(area/Math.PI);
	return radius
}

function changeTimeslice(){
	//update the header showing current time
	disTime = Math.round(globals.currentTime / 100) * 100
	$("#currentTime").text(disTime + " Years BP")
	//changes the timeslice of the current view
	globals.map.eachLayer(function(layer, feature){
		if (layer.feature){
	             //access feature properties
	            var props = layer.feature.properties;
	            var siteName = props["Site"] // get the site name
	             r = interpolateSymbolValue(props, globals.currentTime)
	            if (globals.currentTime == 0 && r == 0){
	            	//pass
	            }else{
	            	if (props.Age > 0){
	            		layer.bringToBack() //put ice in the back
	            	}else{


			           	if (r == 0){
			           		rScaled = 0
			           	}else{
			           		rScaled = calcSymbolRadius(r)
			           	}
			            //sometimes the pull timeline will be out of bounds, so fail gracefully
			            if (isNaN(rScaled)){
			            	rScaled = 2
			            	layer.setStyle({'color' : 'black'})

			            }
			            if (rScaled == 0){

			            	rScaled = 2
			            	layer.setStyle({'color' : 'black', 'fillOpacity' : 0})

			            }else{
			            	layer.setStyle({'color' : 'black', 'fillOpacity' : 0.5})
			            }
			            layer.setRadius(rScaled)
			            var displayVal = Math.round(r * 100) / 100
			           if (props.Type == "Pollen"){
			           		var popupContent = "<div><b>Site Name: </b><span class='text-muted'>" + siteName + "</span><br /><b>Time Slice Value: </b><span class='text-muted'>" + displayVal + "%</span>"

					           }else if (props.Type == "Mammals"){
			           	var popupContent = "<div><b>Site Name: </b><span class='text-muted'>" + siteName + "</span><br /><b>Dated Individuals: </b><span class='text-muted'>" + displayVal + " </span>"
			           }else{
			           	popupContent = "<div>No Content Available</div>"
			           }
				 		layer.bindPopup(popupContent)
		            }
	            }//end else


	        };
	})
	updateLegend() // reflect changes in the legend
	showIceSheets(globals.currentTime) //show the nearest icesheet boundary
};
function interpolateSymbolValue(props, year){
	//changes the symbol sizes when the timeslice is between two defined intervals

	if (year == 0){//fixes the default to zero behavior
		return props[globals.defaultAttribute]
	}

	upperYear = Math.ceil(year/1000)*1000
	try{
		// if (upperYear > 22000){
			// upperYear = 22000
		// }
		// if (upperYear < 0){
			// upperyear = 0
		// }
		lowerYear = upperYear - 1000;
		//get the index of the property in the array
		indexUpper = globals.ages.indexOf(upperYear);
		indexLower = globals.ages.indexOf(lowerYear);
		if (indexUpper == -1 || indexLower == -1){
			return 0
		}
		//get the attribute from the properties array/object
		propertyKeys = Object.keys(props)
		upperAttribute = propertyKeys[indexUpper]
		lowerAttribute = propertyKeys[indexLower]
		lowerValue = props[lowerAttribute]
		upperValue = props[upperAttribute]
		// //calculate the right value
		// valDiff = upperValue - lowerValue
		// timeDiff = upperYear - year
		// timeFract = timeDiff / (upperYear - lowerYear)
		// newVal = upperValue + (lowerValue - upperValue) * timeFract
		// //fix some type errors that happen when the timeline is out of bounds.
		// newVal = Number(newVal)
		// if (isNaN(newVal)){
			// newVal = 0
		// }
		val = Number(lowerValue)
		// if (indexLower == -1){
			// lowerValue = props[propertyKeys[globals.ages.indexOf(0)]]
			// console.log("Changing min value")
		// }
		return val //DEBUG
	}
	catch(err){
		console.log("Interpolation error.")
		return 0
	}

}

function clear(){
	//clears the d3 diagram and the layers on the map
	//remove map layers
	globals.map.eachLayer(function(layer, feature){
		if (layer.feature){
				globals.map.removeLayer(layer);

		}
	})
	for (line in globals.diagram.lines){
		thisLine = globals.diagram.lines[line]
		thisLine.remove()
	}
	$("#pic").attr("src", "")
	$("#pic").empty();
	//clear the site stuff
	$("#siteName").text("")
	$("#siteDesc").text("")
	$("#siteLat").text("")
	$("#siteLng").text("")
	$("#siteID").text("")
	$("#taxonomy").empty()
	$("#commonNameList").empty()
	globals.geojsonFile = undefined;
	$("#legend").empty();
	globals.legend = {}
	globals.taxonomy.itisSkip = 0
	$("#symbolSizeInput").val(50)
	globals.symbolMultiplier = 50
	$("#taxonSearch").val("")


}
$("#testClear").click(function(){
	clear()
})

//get relative information about the context of an individual site at a particular time slice

function getMinYear(sitename){
	for (item in globals.taxonData.features){
	if (globals.taxonData.features[item].properties['Site'] == sitename){
	site = globals.taxonData.features[item].properties
				for (prop in site){
					if (prop != "Site" && prop != "Type"){
						if (site[prop] == 0){
							continue;
						}else{
							//find the age at which it is no loger 0
							keyList = Object.keys(site)
							i = keyList.indexOf(prop) //+ 2 //correct for Type and Site as properties
							age = globals.ages[i]
							return age
						}
					}
				}
		}
	}
	return -Infinity //couldnt find a match
}

function getMaxYear(sitename){
	//do the same thing as above but backwards through the properties
	for (item in globals.taxonData.features){
		site = globals.taxonData.features[item].properties
		if (site['Site'] == sitename){
			propKeys = Object.keys(site)
			for (var i=propKeys.length-1; i>=0; i--){
				prop = propKeys[i]//correct for type and site name
				val = site[prop]
				if (val == 0){
					//pass
				}else{
					age = globals.ages[i];
					return age
				}
			}
		}
	}
	return -Infinity
}


function getRankInTimeslice(sitename){
	//gets the relative ranking for this site in relation to all other known sites at this timeslice
	upperYear = Math.ceil(globals.currentTime/1000)*1000
	index = globals.ages.indexOf(upperYear)
	timeVals = []
	for (item in globals.taxonData.features){
		site = globals.taxonData.features[item].properties
		propList = Object.keys(site)
		val = site[propList[index]]
		timeVals.push({'Site': site['Site'], 'Value' : val})
	}
	s = timeVals.sort(function(d){ return d.Value}) //sort the list
	//find the actual ranking
	indexes = $.map(s, function(obj, index) {
	    if(obj.Site == sitename) {
	        return index;
	    }
	})
	rank = indexes[0]//there shouldn't ever be more than one
	rankRev = globals.taxonData.features.length - rank //flip the ordering
	return s.indexOf(rankRev)
}


function getDownload(){
	//opens a new tab with the raw data
	win = window.open(globals.geojsonFile, "_blank")
	win.focus();
}
$("#download").click(function(){
	getDownload();
})

//legend stuff
function createLegend(){
	//creates a legend that shows the size of symbols static through time.
	//find symbols sizes
	rad = []
	globals.map.eachLayer(function(layer, feature){
		if (layer.Age > 0){ //dont include ice
			//basically pass

		}else{
			r = layer._radius
			rad.push(r)
		}

	})
	rSort = rad.sort()

	//find total maximum
	totalMax = 0 //we don't care about anything except this maximum value
	for (item in globals.taxonData.features){
		props = globals.taxonData.features[item].properties
		for (item in props){
			if (Number(props[item]) > totalMax){
				totalMax = Number(props[item])
			}
		}
	}

	//these are the circle radii
	rad1 = Math.sqrt(5 * globals.symbolMultiplier)
	rad2 = Math.sqrt(10 * globals.symbolMultiplier)
	rad3 = Math.sqrt(20 * globals.symbolMultiplier)

	divHeight = $(".legend-container").height() * 1.25

	var suffix
	if (globals.taxonType == "Pollen"){
		suffix = "%"
	}else{
		suffix = " M.N.I."
	}
	//svg setup
	globals.legend.legendHeight = divHeight / 2
	globals.legend.legendWidth = $(".legend-control").width()

	//build the svg
	globals.legend.canvas = d3.select("#legend").append("svg")
		.attr('width', globals.legend.legendWidth)
		.attr('height',globals.legend.legendHeight)

	//calculate bottom of circle
	globals.legend.bottom = globals.legend.legendHeight/2 + rad3

	globals.legend.maxCircle = globals.legend.canvas
		.append('circle')
			.attr('cx', rad3)
			.attr('cy', globals.legend.bottom - rad3)
			.attr('r', rad3)
			.style('fill', globals.colors.blue)
			.style('opacity', 0.5)
			.style('stroke', 'black')

	globals.legend.maxText = globals.legend.canvas.append('text')
		.attr('x', rad3 * 2)
		.attr('y', globals.legend.legendHeight/2 -20)
		.text("20" + suffix)

	globals.legend.midCircle = globals.legend.canvas.append('circle')
			.attr('cx', rad3)
			.attr('cy', globals.legend.bottom - rad2)
			.attr('r', rad2)
			.style('fill', globals.colors.blue)
			.style('opacity', 0.5)
			.style('stroke', 'black')

	globals.legend.midText = globals.legend.canvas.append('text')
		.attr('x', rad3 * 2)
		.attr('y', globals.legend.legendHeight/2 -5)
		.text("10" + suffix)

	globals.legend.minCircle = globals.legend.canvas.append('circle')
			.attr('cx', rad3)
			.attr('cy',globals.legend.bottom  - rad1)
			.attr('r', rad1)
			.style('fill', globals.colors.blue)
			.style('opacity', 0.5)
			.style('stroke', 'black')

	globals.legend.minText =globals.legend.canvas.append('text')
		.attr('x', rad3 * 2)
		.attr('y', globals.legend.legendHeight/2 +20)
		.text("5" + suffix)

}

function updateLegend(){
	//update when symbol size changes

	//calculate new radii
	rad1 = Math.sqrt(5 * globals.symbolMultiplier)
	rad2 = Math.sqrt(10 * globals.symbolMultiplier)
	rad3 = Math.sqrt(20 * globals.symbolMultiplier)

	//recalculate where the bottom is
	globals.legend.bottom = globals.legend.legendHeight/2 + rad3
	//set radii of circles and update the cy to make them all align at bottom
	globals.legend.maxCircle.attr('r', rad3).attr('cy',globals.legend.bottom - rad3)
	globals.legend.midCircle.attr('r', rad2).attr('cy',globals.legend.bottom - rad2)
	globals.legend.minCircle.attr('r', rad1).attr('cy',globals.legend.bottom - rad1)
	//adjust text


	globals.legend.maxText.attr('x', rad3 * 2)
	globals.legend.midText.attr('x', rad3 * 2)
	globals.legend.minText.attr('x', rad3 * 2)
	return
}


function changeSymbolMultiplier(newMultiplier){
	//change the actual symbols
	globals.symbolMultiplier = newMultiplier
	changeTimeslice() // this is what updates the symbol sizes even though we are not changing time
}


function initializeLegendChange(){
	//must be called after the legend is created to be able to change symbol size.
		$("#symbolSizeInput").change(function(e){
		//bind the event to the slider
		newMultiplier = $("#symbolSizeInput").val() * 2
		changeSymbolMultiplier(newMultiplier)
	})
}



function loadIceSheetData(){
	//loads the ice sheet file into the map --> happens on init
	$.ajax("/PaleoView/assets/data/icesheets.json", {
		beforeSend: function(){
			console.log("Getting ice sheet data.")
		},
		dataType:"json",
		success: function(response){
			console.log("Successfully got ice sheet data.")
			globals.icesheetsData = response
			addIceSheetData();
			console.log(response)
		},
		error: function(xhr, status, error){
			console.log('ERROR!')
		}
	})
}

function addIceSheetData(){
		//add the data to the map
	 iceData = L.geoJson(globals.icesheetsData, {
	 	style: inactiveIceOptions,
	 }).addTo(globals.map)
	 iceData.bringToBack()
}

function getClosestIceSheetAge(age){
	//make an array of all possible ages the first time
	if (!globals.icesheetAges){
		globals.icesheetAges = []
		globals.icesheetAges.push(0)
		globals.map.eachLayer(function(layer, feature){
			if (layer.feature){
				if (layer.feature.properties.Age > 0){
					globals.icesheetAges.push(layer.feature.properties.Age )
				}
			}
		})
	}
	//get the boundary conditions
	//get the closest value in the array
	cur = globals.icesheetAges[0]
	t = age
	globals.icesheetAges.forEach(function(val){
		if (Math.abs(val - t) < Math.abs(val - cur)){
			cur = val
		}
	})
	return cur
}

function showIceSheets(age){
	closestAge = getClosestIceSheetAge(age)
	globals.map.eachLayer(function(layer, feature){
		if (layer.feature){
			if (layer.feature.properties.Age > 0){
				if (layer.feature.properties.Age == closestAge){
					layer.setStyle(iceOptions)
				}else{
					layer.setStyle(inactiveIceOptions)
				}
			}
		}
	})
}

function hideIceSheets(){
		globals.map.eachLayer(function(layer, feature){
		if (layer.feature){
			if (layer.feature.properties.Age > 0){
				layer.setStyle(inactiveIceOptions)
			}
		}
	})
}
