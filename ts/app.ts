declare var require;

//var jQuery = require('jquery');
var $ = require('jquery');
var foundation = require('foundation-sites');


$(document).ready(setRunt);

function setRunt() {
	$(document).foundation();
	$('#runt').click( pusser );	
	$('#toggly').click(toggit);
}

function toggit() {
	$('#stain').toggle();
}


function pusser() {
	alert('runty clicked');
	$('#stain').toggle();
}

