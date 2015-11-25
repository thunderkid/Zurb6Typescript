declare var require;

//var jQuery = require('jquery');
var $ = require('jquery');
var foundation = require('foundation-sites');


$(document).ready(setRunt);


function setRunt() {
	$('#runt').click( pusser );	
}

function pusser() {
	alert('runty clicked');
	$('#stain').toggle();
}

