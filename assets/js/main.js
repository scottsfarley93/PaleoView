/**
 * @author Scott Farley
 */

//global vars
var globals = {}

$(document).ready(function(){
	console.log("Running main.js")
	
	//make the map
	createMap()
	//load the points
	loadPoints()
	

	
})

function createMap(){
		//create a map
	globals.map = L.map('map').setView([37.82, -122.2], 9);
	//add some tiles
	var mapTiles = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
		maxZoom: 16,
		attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
	});
	mapTiles.addTo(globals.map) //this adds it to the map
}

function loadPoints(){
	$.ajax("assets/data/pinus_contorta.geojson", {
		success: function(response){
			console.log(response);
			//add it to the map
			L.geoJson(response, {
				onEachFeature: onEachFeature,
				pointToLayer: function (feature, latlng) {
        			return L.circleMarker(latlng, geojsonMarkerOptions)}
			}).addTo(globals.map)
			
		},
		dataType: "json",
		error: function(error){
			console.log(error);
		},
		beforeSend: function(){
			console.log("Getting data.")
		}
	})
}


var geojsonMarkerOptions = {
    radius: 8,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

function onEachFeature(feature, layer){
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
}
