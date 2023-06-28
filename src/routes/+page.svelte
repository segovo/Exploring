<script>
	import { json } from 'd3';
	// import { geoPath, geoNaturalEarth1, select } from 'd3';
	import * as d3 from 'd3';
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import * as topojsonClient from 'topojson-client';
	import { geoPatterson, geoArmadillo } from 'd3-geo-projection';
	import _ from 'lodash';
	import * as turf from '@turf/turf';
	// import * as simpleWorldMap from '$lib/map/simpleworld.json';
	// import * as complexWorldMap from '$lib/map/world.json';
	// import * as worldMap from '$lib/map/world.json';
	// import * as veryComplexWorldMap from '$lib/map/ne_10m_admin_0_countries.json';
	import * as neworldMap from '$lib/map/ne_50m_admin_0_countries_lakes.json';
    // import * as neworldMap from '$lib/map/ne_110m_admin_0_countries_lakes.json'
	import * as neboundaryLinesStates from '$lib/map/ne_50m_admin_1_states_provinces_lakes_lines.json';
	import * as neboundaryLines from '$lib/map/ne_50m_admin_0_boundary_lines_land.json';
	import * as populatedPlaces from '$lib/map/ne_50m_populated_places_simple.json';
	import * as states from '$lib/map/ne_50m_admin_1_states_provinces_lakes.json';
	import * as urbanAreas from '$lib/map/ne_50m_urban_areas.json';
	// import * as countryJson from '$lib/data/countries.json';
	import * as countryJson from '$lib/data/mergedData.json';
	import * as countryCenters from '$lib/data/countrycenters.json';
	import * as importAirports from '$lib/data/airports/ne_10m_airports.json';
	import airportIcon from '$lib/icons/airport.svg';

	console.log('states: ', states);

	let airports = importAirports;
	// const topojson = worldMap;
	// const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	const geojson = neworldMap;
	// const geojson = simpleWorldMap;

	let dataset = geojson.features;

	let countryNamesDataset = geojson.features;
	let cityNamesDataset = populatedPlaces.features;
	let stateNamesDataset = states.features;

	const countryData = Object.entries(countryJson.default);

	const sandyCountries = [
		'Tunisia',
		'Western Sahara',
		'Libya',
		'Egypt',
		'Algeria',
		'Saudi Arabia',
		'Morocco',
		'Chile',
		'Oman',
		'Yemen',
		'Iraq',
		'Kuwait',
		'United Arab Emirates',
		'Bahrain',
		'Israel',
		'Syria',
		'Jordan',
		'Palestine',
		'Lebanon',
		'Qatar',
		'Iran',
		'Australia'
	];
	sandyCountries.forEach((country) => {
		const index = dataset.findIndex((d) => d.properties.NAME_EN == country);

		if (index !== -1) {
			dataset[index].properties.MAPCOLOR7 = 8;
		} else {
			console.error('index not found for ', country);
		}
	});

    // dataset.forEach((geojson) => {
    //     geojson.properties.center = turf.centerOfMass(geojson);
	// });

	// countryData.forEach((country) => {
	// 	// const index = dataset.findIndex((d) => d.properties.GEOUNIT == country[0]);

	// 	// if (index !== -1) {
	// 	// 	dataset[index].properties.color = country[1].color;
	// 	// 	dataset[index].properties.population = country[1].population;
	// 	// 	dataset[index].properties.ISO2 = country[1].ISO2;
	// 	// } else {
	// 	// 	console.log('index not found for ', country[0]);
	// 	// }
	// });
    // let dataset = [];
    // geojson.features.forEach((geojson, i) => {
	// 	const chunks = turf.lineChunk(geojson, 1000);
	// 	chunks.features.forEach((chunk) => {
	// 		chunk.center = turf.centroid(chunk);
	// 		boundaryLines.push(chunk);
	// 	});
	// });
    geojson.features.forEach((geojson) => {
        geojson.bbox = turf.bbox(geojson)
    })
    console.log('dataset: ', dataset)

	let boundaryLines = [];
	neboundaryLines.features.forEach((geojson, i) => {
		const chunks = turf.lineChunk(geojson, 1000);
		chunks.features.forEach((chunk) => {
			chunk.center = turf.centroid(chunk);
			boundaryLines.push(chunk);
		});
	});


    console.log('boundaryLines: ', boundaryLines)

	let boundaryLinesStates = [];
	neboundaryLinesStates.geometries.forEach((geojson, i) => {
		const chunks = turf.lineChunk(geojson, 200);
		chunks.features.forEach((chunk) => {
			chunk.center = turf.centroid(chunk);
			boundaryLinesStates.push(chunk);
		});

		// console.log(chunks.features[0])
		// console.log(chunks)
		// console.log('chunks: ', chunks)
		// if (chunks.length > 1) {
		//     chunks.features.splice(0, 1)
		//     chunks.features.forEach((feature) => {
		//     boundaryLinesStates.geometries.push(feature)
		// })
		// }
		// geojson = turf.lineChunk(geojson, 1})
		// geometry.center = turf.centroid(geometry)
	});

	// console.log('boundaryLinesStates: ', boundaryLinesStates);

	let largestArea = 0;
	dataset.forEach((geojson) => {
		geojson.properties.area = turf.area(geojson);
		if (geojson.properties.area > largestArea) {
			// console.log('! geojson : ', geojson);
			largestArea = geojson.properties.area;
		}

		// const countryCenter = countryCenters.features.find(
		// 	(country) => country.properties.ISO === geojson.properties.ISO2
		// );
		// if (countryCenter) {
		// 	// console.log('Country center: ', countryCenter);
		// 	geojson.properties.center = countryCenter;
		// } else {
		// 	geojson.properties.center = turf.centerOfMass(geojson);
		// }
		geojson.properties.center = [geojson.properties.LABEL_X, geojson.properties.LABEL_Y];
		// geojson.properties.center.geometry = {};
		// geojson.properties.center.geometry.coordinates = [
		// 	geojson.properties.LABEL_X,
		// 	geojson.properties.LABEL_Y
		// ];
		// let max_area_polygon;
		// let max_area = 0;

		// geojson.geometry.coordinates.forEach((poly) => {
		// 	const depth = getArrayDepth(poly);

		// 	let polygon;
		// 	if (depth > 2) {
		// 		polygon = turf.polygon(poly);
		// 	} else {
		// 		polygon = turf.multiPolygon(poly);
		// 	}
		// 	// const polygon = turf.polygon(poly);
		// 	const area = turf.area(polygon);
		// 	if (area > max_area) {
		// 		max_area = area;
		// 		max_area_polygon = polygon;
		// 	}
		// });

		// if (max_area_polygon) {
		// 	geojson.properties.center = turf.centerOfMass(max_area_polygon);
		// } else {
		// 	geojson.properties.center = turf.centerOfMass(geojson);
		// 	// console.log('FAILED! ', geojson.properties.name);
		// }
	});

	function getArrayDepth(obj) {
		if (Array.isArray(obj)) return 1 + Math.max(...obj.map((t) => getArrayDepth(t)));
		else return 0;
	}

	let svg;
	let d3Svg;
	let scale = 1;
	let transform = d3.zoomIdentity;
	let mousePos;

	let d3Pointer;

	function handleMousemove(e) {
		d3Pointer = transform.invert(d3.pointer(e, d3Svg));
		// console.log('D3 POINTER proj: ', d3Pointer);
		// console.log('non: ', e.clientX, e.clientY)
		// console.log('mousemove: ', projection([e.clientX, e.clientY])[0], projection([e.clientX, e.clientY])[1]);
		mousePos = { x: e.clientX, y: e.clientY };
	}


    let transformReset = false;

	function zoomed(e) {
        const t = e.transform;

        if ((0 - (t.x / t.k)) > mapRealRightEdge) {
            //DEBUG
            // console.log('INFORMATION: ', [
            //     {
            //         mapRealLeftEdge,
            //         'mapRealLeftEdge*t.k': mapRealLeftEdge*t.k,
            //     },
            //     {
            //         't.k': t.k,
            //         't.x': t.x,
            //         '0-t.x': 0-t.x,
            //         '0-t.x/t.k': 0-t.x/t.k,
            //         'mapRealWidth': mapRealWidth,
            //         'mapRealLeftEdge': mapRealLeftEdge,
            //         'mapRealRightEdge': mapRealRightEdge,
            //         'mapRealWidth-mapRealLeftEdge': mapRealWidth-mapRealLeftEdge,
            //         '(mapRealWidth-mapRealLeftEdge)*t.k': (mapRealWidth-mapRealLeftEdge)*t.k,
            //         '(0 - t.x - ((mapRealWidth-mapRealLeftEdge) * t.k))': (0 - t.x - ((mapRealWidth-mapRealLeftEdge) * t.k))
            //     }
            // ])

            t.x =  -(0 - t.x - (mapRealWidth * t.k))
            // transform.x = -(leftEdge - (mapWidth * zoom))
        } else if (((clientX / t.k) - (t.x / t.k)) < mapRealLeftEdge) {
            t.x =  -(0 - t.x + (mapRealWidth*t.k))
            // transform.x = -(leftEdge + (mapWidth * zoom))
        }

		// t.x = Math.min(clientX / 2, Math.max(t.x, clientX / 2 - clientX * t.k));
		// t.y = Math.min(clientY / 2, Math.max(t.y, clientY / 2 - clientY * t.k));
		transform = t;
		if (e.sourceEvent) mousePos = { x: e.sourceEvent.clientX, y: e.sourceEvent.clientY };
	}

	let projection = geoPatterson();

	// $: projection = d3
	// .geoNaturalEarth1()
	// .scale(clientY / 1 / Math.PI)
	// .translate([clientX / 2, clientY / 2]);
	// $: projection = geoPatterson()
	// 	.scale(clientY / 1 / Math.PI)
	// 	.translate([clientX / 2, clientY / 2]);
	// $: path = d3.geoPath(projection);
	// let projection = d3.geoMercator();

	const mapSize = d3
		.geoPath()
		.projection({ stream: (stream) => projection.stream(stream) })
		.bounds(geojson);
	console.log('mapSize', mapSize);

    const mapRealLeftEdge = mapSize[0][0]
    const mapRealRightEdge = mapSize[1][0]
	const mapRealWidth = mapSize[1][0] - mapSize[0][0];

	// mapSize[0][0] = mapSize[0][0] - 200;
	// mapSize[1][0] = mapSize[1][0] + 200;

	const mapWidth = mapSize[1][0] - mapSize[0][0];
	const mapHeight = mapSize[1][1] - mapSize[0][1];

	// $: console.log('datad3 ', transform);
	let zoom = d3
		.zoom()
		.scaleExtent([2, 1024])
		.translateExtent([[mapSize[0][0]-mapRealWidth*2, mapSize[0][1]], [mapSize[1][0]+mapRealWidth*2, mapSize[1][1]]])
		.on('zoom', zoomed)
		.clickDistance(10);

	// .translateExtent(mapSize)
	const path = d3.geoPath(projection);
	// $: path = getPath(scale);
	// $: path = d3.geoPath(projection);

	// $: bounds = d3
	// 	.geoPath(projection)
	// 	// .projection({ stream: (stream) => projection.stream(stream) })
	// 	.bounds(geojson);

	// function getPath(s) {
	// 	return d3.geoPath(projection);
	// 	// .projection({ stream: (stream) => projection.stream(stream) })
	// 	// .pointRadius(0.01 * s);
	// }

	// const initialTransform = { k: 6.147500725152074, x: -2193.8890833797695, y: -634.4553424635553 }

	function centerMap() {
		// scale =
		// 	0.95 /
		// 	Math.max((bounds[1][0] - bounds[0][0]) / clientX, (bounds[1][1] - bounds[0][1]) / clientY);
		// projection
		// 	.scale(scale)
		// 	.translate([
		// 		(clientX - scale * (bounds[1][0] + bounds[0][0])) / 2,
		// 		(clientY - scale * (bounds[1][1] + bounds[0][1])) / 2
		// 	]);
		// d3Svg.transition().duration(750).call(zoom.transform, initialTransform);
		// if (clientX < 800) d3Svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
	}

	// const initialTransform = { k: 6.147500725152074, x: -2193.8890833797695, y: -634.4553424635553 }

	onMount(async () => {
		d3Svg = d3.select(svg);
		d3Svg.call(zoom);
		d3.zoomIdentity.k = 3;
		d3.zoomIdentity.x = -720;
		d3.zoomIdentity.y = -170;
		transform = d3.zoomIdentity;
		// setTimeout(() => {
		// 	console.error('d3: ', d3.zoomIdentity);
		// 	// const initialTransform = d3.zoomIdentity{ k: 6.147500725152074, x: -2193.8890833797695, y: -634.4553424635553 }
		// 	// d3.zoomIdentity.k = 6.147500725152074;
		// 	// d3.zoomIdentity.x =  -2193.8890833797695;
		// 	// d3.zoomIdentity.y = -634.4553424635553;
		// 	// transform = d3.zoomIdentity;
		// 	// d3Svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
		// }, 2000);
		// centerMap();
	});

	let clientX;
	let clientY;

	$: console.log('selected: ', selected);
	let selected;
	let hovered;

	const colors = [
		'#D7F5A7',
		'#C3E9A0',
		'#BEE39C',
		'#D7F5A7',
		'#BEE39C',
		'#BEE39C',
		'#D7F5A7',
		'#D7F5A7',
		'#FDF0E6'
	];

	let activeCountry;
	let prevCountryLabel;
	let countryLabel;
	let countryLabelBG;
	$: selected, addBGToLabel();

	async function addBGToLabel() {
		console.log('SELF EXECUTING: ', selected?.properties?.name.toString());
		if (!svg) {
			return;
		}

		await tick();

		if (!activeCountry) {
			return;
		}
		if (countryLabelBG) {
			countryLabelBG.remove();
		}

		console.log('Running: ', selected?.properties?.name.toString());

		const text = d3.select(countryLabel);
		const parent = d3.select(countryLabel.parentNode);
		const bbox = text.node().getBBox();

		d3.select(activeCountry);
		const padding = 1;

		countryLabelBG = parent
			.insert('rect', 'text')
			.attr('x', bbox.x - padding)
			.attr('y', bbox.y - padding)
			.attr('rx', '1px')
			.attr('ry', '1px')
			.attr('width', bbox.width + padding * 2)
			.attr('height', bbox.height + padding * 2)
			.style('fill', '#40814C')
			.style('border-radius', '5px')

			.style('stroke', 'none');
	}

	console.log(
		'france: ',
		countryNamesDataset.find((country) => country.properties.GEOUNIT === 'France')
	);
	function computeColor(population, color) {
		if (population) {
			return colors[color];
		} else {
			return '#3E3A3A';
		}
	}

	// $: strokeWidth = transform.k > 4 ? 4 / transform.k : 0;

	// $: console.log(transform.k);
	// $: console.log(transform.x / transform.k, transform.y / transform.k);
	// $: zoomLevel = (transform.k - 1) / 127;
	// $: console.log('zoomLevel: ', zoomLevel);

	let tier1data = [];
	let tier2data = [];
	let tier3data = [];

	// console.log('countryNamesDataset: ', countryNamesDataset);
	countryNamesDataset.sort((a, b) => (a.properties.POP_EST < b.properties.POP_EST ? -1 : 1));

	// countryNamesDataset.forEach((country, i) => {
	//     if (country.properties.population == null) {
	//         console.log('splice: ', country.properties.name)
	//         countryNamesDataset.splice(i, 1)
	//     }
	// });
	console.log('countryNamesDataset: ', countryNamesDataset);

	countryNamesDataset.forEach((point) => {
		let pointData = {};
		pointData.x = projection(point.properties.center)[0];
		pointData.y = projection(point.properties.center)[1];
		pointData.point = point;
		pointData.type = 'tier1';
		// pointData.point.properties.labelrank = point.properties.LABELRANK - 1;

		tier1data.push(pointData);
	});

	cityNamesDataset.sort((a, b) => (a.properties.labelrank > b.properties.labelrank ? -1 : 1));
	// cityNamesDataset.splice(0, cityNamesDataset.length - 300);
	console.log('cityNamesDataset: ', cityNamesDataset);

	cityNamesDataset.forEach((point) => {
		let pointData = {};
		pointData.x = projection(point.geometry.coordinates)[0];
		pointData.y = projection(point.geometry.coordinates)[1];
		point.properties.center = point.geometry.coordinates;
		pointData.point = point;
		pointData.type = 'tier2';

		tier2data.push(pointData);
	});

	stateNamesDataset.forEach((point) => {
		console.log('adding');
		let pointData = {};

		const centerX = (point.bbox[0] + point.bbox[2]) / 2;
		const centerY = (point.bbox[1] + point.bbox[3]) / 2;
		point.properties.center = [centerX, centerY];
		// pointData.x = projection(point.geometry.coordinates)[0];
		// pointData.y = projection(point.geometry.coordinates)[1];
		pointData.x = projection(centerX);
		pointData.y = projection(centerY);
		pointData.point = point;

		tier2data.push(pointData);
	});

	// 	pointData.type = 'tier1';

	// 	tier2data.push(pointData);
	// });

	// tier1data.sort((a, b) => (a.point.properties.labelrank > b.point.properties.labelrank ? -1 : 1));

	airports.features.forEach((airport) => {
		let pointData = {};
		pointData.x = projection(airport.geometry.coordinates)[0];
		pointData.y = projection(airport.geometry.coordinates)[1];
		airport.properties.center = airport.geometry.coordinates;
		pointData.point = airport;
		pointData.type = 'tier3';

		tier3data.push(pointData);
	});

	console.log('LENGTH: ', tier2data.length);

	// let zoomLevels = [
	// 	{ k: 2.1, radius: 20, hasRun: false },
	// 	{ k: 3, radius: 16, hasRun: false },
	// 	{ k: 3.5, radius: 12, hasRun: false },
	// 	{ k: 4, radius: 8, hasRun: false },
	// 	{ k: 6, radius: 7, hasRun: false },
	// 	{ k: 8, radius: 6, hasRun: false },
	// 	{ k: 16, radius: 1.5, hasRun: false },
	// 	{ k: 32, radius: 0, hasRun: false }
	// ];

	// let zoomLevels = [
	// 	{ k: 2.1, radius: 40, hasRun: false },
	// 	{ k: 2.4, radius: 24, hasRun: false },
	// 	{ k: 3.5, radius: 20, hasRun: false },
	// 	{ k: 5, radius: 16, hasRun: false },
	// 	{ k: 6.5, radius: 12, hasRun: false },
	// 	{ k: 8, radius: 8, hasRun: false },
	// 	{ k: 9, radius: 6, hasRun: false },
	// 	{ k: 10, radius: 4, hasRun: false },
	// 	{ k: 14, radius: 3, hasRun: false },
	// 	{ k: 18, radius: 1.5, hasRun: false },
	// 	{ k: 32, radius: 0.5, hasRun: false },
	// 	{ k: 64, radius: 0, hasRun: false }
	// ];

    // let zoomLevels = [
	// 	{ k: 2.1, radius: 40, hasRun: false },
	// 	{ k: 2.4, radius: 24, hasRun: false },
	// 	{ k: 3.5, radius: 12, hasRun: false },
	// 	{ k: 5, radius: 6, hasRun: false },
	// 	{ k: 6.5, radius: 5, hasRun: false },
	// 	{ k: 8, radius: 4, hasRun: false },
	// 	{ k: 9, radius: 3, hasRun: false },
	// 	{ k: 10, radius: 2, hasRun: false },
	// 	{ k: 14, radius: 1, hasRun: false },
	// 	{ k: 18, radius: 0.8, hasRun: false },
	// 	{ k: 32, radius: 0.3, hasRun: false },
	// 	{ k: 64, radius: 0, hasRun: false }
	// ];

    let zoomLevels = [
		{ k: 2.1, radius: 40, hasRun: false },
		{ k: 2.4, radius: 30, hasRun: false },
		{ k: 3.5, radius: 24, hasRun: false },
		{ k: 5, radius: 18, hasRun: false },
		{ k: 6.5, radius: 12, hasRun: false },
		{ k: 8, radius: 8, hasRun: false },
		{ k: 9, radius: 6, hasRun: false },
		{ k: 10, radius: 4, hasRun: false },
		{ k: 14, radius: 2, hasRun: false },
		{ k: 18, radius: 1, hasRun: false },
		{ k: 32, radius: 0.3, hasRun: false },
		{ k: 64, radius: 0, hasRun: false }
	];


	let searchRadius;

	function setVisibility(datum, quadtree) {
		quadtree.remove(datum);
		const neighbor = quadtree.find(datum.x, datum.y, searchRadius);
		if (neighbor) {
			datum.point.properties.visible = false;
		} else {
			datum.point.properties.visible = true;
			quadtree.add(datum);
		}
	}

	function updateAirportVisibilities() {
		// console.log(scale);
		zoomLevels.forEach(async (level, i) => {
			if (
				(level.hasRun === false && transform.k > level.k) ||
				(level.hasRun && transform.k < level.k)
			) {
				searchRadius = level.radius;
				if (level.hasRun && transform.k < level.k) {
					if (i > 0) {
						searchRadius = zoomLevels[i - 1].radius;
					}
				}

				updateVisibilities();

				if (level.hasRun === false && transform.k > level.k) {
					level.hasRun = true;
				} else if (level.hasRun && transform.k < level.k) {
					level.hasRun = false;
				}

				zoomLevels = zoomLevels;
				// console.log(dataset);
				// airports = airports;
			}
		});
	}

	function updateVisibilities() {
		const quadtree = d3
			.quadtree()
			.x((d) => d.x)
			.y((d) => d.y);

		// if (transform.k < zoomLevels[8].k) {
		let visibleTier1 = [];
		let visibleTier2 = [];
		let visibleTier3 = [];

		tier1data.forEach((datum) => {
			if (pointIsInViewbox(mapTiler(projection(datum.point.properties.center)))) {
				visibleTier1.push(datum);
			} else {
                datum.point.properties.visible = false;
            }
		});

		quadtree.addAll(visibleTier1);
		visibleTier1.forEach((point) => {
			setVisibility(point, quadtree);
		});

		if (transform.k > zoomLevels[4].k) {
			tier2data.forEach((datum) => {
				if (pointIsInViewbox(mapTiler(projection(datum.point.properties.center)))) {
					visibleTier2.push(datum);
				} else {
                    datum.point.properties.visible = false;
                }
			});

			quadtree.addAll(visibleTier2);
			visibleTier2.forEach((point) => {
				setVisibility(point, quadtree);
			});
		} else {
			tier2data.forEach((point) => {
				point.point.properties.visible = false;
			});
		}

		if (transform.k > zoomLevels[6].k) {
			tier3data.forEach((datum) => {
				if (pointIsInViewbox(mapTiler(projection(datum.point.properties.center)))) {
					visibleTier3.push(datum);
				} else {
                    datum.point.properties.visible = false;
                }
			});

			quadtree.addAll(visibleTier3);
			visibleTier3.forEach((point) => {
				setVisibility(point, quadtree);
			});
		} else {
			tier3data.forEach((point) => {
				point.point.properties.visible = false;
			});
		}

		// console.log('visibleTier1: ', visibleTier1);
		// console.log('visibleTier2: ', visibleTier2);
		// console.log('visibleTier3: ', visibleTier3);
		// console.log('SIZE: ', quadtree.size());
		airports = airports;
		countryNamesDataset = countryNamesDataset;
		stateNamesDataset = stateNamesDataset;
		cityNamesDataset = cityNamesDataset;
	}

	function screenToVirtual(point, transform) {
		// const x = (0 - transform.x) / transform.k - mapWidth / 2;
		// const y = (0 - transform.y) / transform.k - mapHeight / 2;
		const x = point.x / transform.k - transform.x / transform.k;
		const y = point.y / transform.k - transform.y / transform.k;
		return [x, y];
	}

	// $: updateAirportVisibilities(transform.k);
	// $: console.log('zoomlevels: ', zoomLevels);
	// $: console.log('transform: ', transform.invert(d3.pointer({ clientX: transform.x, clientY: transform.y}, d3Svg)))
	// $: console.log('screentovirtual: ', screenToVirtual({ x: 0, y: 0 }, transform));
	// $: console.log('test virt: ', transform, clientX, clientY, mapWidth, mapHeight);

	// $: console.log('screen2virtual: ', screenToVirtual({ x: clientX, y: clientY }, transform));

	$: viewboxTopLeft = screenToVirtual({ x: 0, y: 0 }, transform);
	$: viewboxBottomRight = screenToVirtual({ x: clientX, y: clientY }, transform);
    
	// function pointIsInViewbox(point) {
	// 	// const boxTopLeftX = viewboxTopLeft[0] + 300 / transform.k;
	// 	// const boxTopLeftY = viewboxTopLeft[1] + 100 / transform.k;
	// 	// const boxBottomRightX = viewboxBottomRight[0] - 300 / transform.k;
	// 	// const boxBottomRightY = viewboxBottomRight[1] - 100 / transform.k;
	// 	// const boxTopLeftX = viewboxTopLeft[0] - 100 / transform.k;
	// 	// const boxTopLeftY = viewboxTopLeft[1] - 100 / transform.k;
	// 	// const boxBottomRightX = viewboxBottomRight[0] + 100 / transform.k;
	// 	// const boxBottomRightY = viewboxBottomRight[1] + 100 / transform.k;
    //     const boxTopLeftX = viewboxTopLeft[0];
	// 	const boxTopLeftY = viewboxTopLeft[1];
	// 	const boxBottomRightX = viewboxBottomRight[0];
	// 	const boxBottomRightY = viewboxBottomRight[1];

	// 	const isWithinXRange = point[0] >= boxTopLeftX && point[0] <= boxBottomRightX;
	// 	const isWithinYRange = point[1] >= boxTopLeftY && point[1] <= boxBottomRightY;

	// 	return isWithinXRange && isWithinYRange;
	// }

	function pointIsInViewbox(point) {
        callCount++
		return  point[0] >= viewboxTopLeft[0] && point[0] <= viewboxBottomRight[0] && point[1] >= viewboxTopLeft[1] && point[1] <= viewboxBottomRight[1];
	}

    // function mapTiler(point) {
    //     if (point[0] < viewboxTopLeft[0] && viewboxBottomRight[0] > mapRealRightEdge) {
    //         return [point[0] + mapRealWidth, point[1]]
    //     } else if (point[0] > viewboxBottomRight[0] && viewboxTopLeft[0] < mapRealLeftEdge) {
    //         return [point[0] - mapRealWidth, point[1]]
    //     }

    //     return point
    // }
    function bboxIntersectsViewbox(bbox) {
        let bboxTopLeft = projection([bbox[0], bbox[3]])
        let bboxBottomRight = projection([bbox[2], bbox[1]])

        // if (viewboxBottomRight[0] > mapRealLeftEdge && bboxTopLeft[0] > viewboxBottomRight[0]) {
        //     bboxTopLeft = [bboxTopLeft[0] + mapRealWidth, bboxTopLeft[1]]
        //     bboxBottomRight = [bboxBottomRight[0] + mapRealWidth, bboxBottomRight[1]]
        // }
        //  else if (viewboxTopLeft[0] < mapRealLeftEdge && bboxTopLeft[0] > viewboxTopLeft[0]) {
        //     bboxTopLeft = [bboxTopLeft[0] - mapRealWidth, bboxTopLeft[1]]
        //     bboxBottomRight = [bboxBottomRight[0] - mapRealWidth, bboxBottomRight[1]]
        // }
        // // let r1 = {
        //     left: bboxTopLeft[0],
        //     right: bboxBottomRight[0],
        //     top: bboxTopLeft[1],
        //     bottom: bboxBottomRight[1]
        // }

        // let r2 = {
        //     left: viewboxTopLeft[0],
        //     right: viewboxBottomRight[0],
        //     top: viewboxTopLeft[1],
        //     bottom: viewboxBottomRight[1]
        // }
        console.log('bbox')
        return !(viewboxTopLeft[0] > bboxBottomRight[0] || viewboxBottomRight[0] < bboxTopLeft[0] || viewboxTopLeft[1] > bboxBottomRight[1] || viewboxBottomRight[1] < bboxTopLeft[1]);
    }

	let prevViewboxCoords = [0, 0];
    let prevK = 0;

	function updateDisplayedPoints() {
		const currentViewboxCoords = [0 - transform.x / transform.k, 0 - transform.y / transform.k];

		const distanceX = Math.abs(currentViewboxCoords[0] - prevViewboxCoords[0]);
		const distanceY = Math.abs(currentViewboxCoords[1] - prevViewboxCoords[1]);
        const distanceK = Math.abs(transform.k - prevK)

		if (distanceX > 100 / transform.k || distanceY > 100 / transform.k) {
			console.log('View box moved by more than 100 units.');
			updateVisibilities();
			// countryNamesDataset = countryNamesDataset;
			// stateNamesDataset = stateNamesDataset;
			// cityNamesDataset = cityNamesDataset;
			prevViewboxCoords = currentViewboxCoords;
			boundaryLinesStates = boundaryLinesStates;
            boundaryLines = boundaryLines;
            // dataset = dataset;
		} else {
            updateAirportVisibilities(transform.k);
            // prevK = transform.k;
        }
	}

	$: transform, updateDisplayedPoints();

	// function testVis() {
	// 	if (mousePos && mousePos.x) {
	// 		// const mousePosOnMap = projection([mousePos.x, mousePos.y]);
	// 		// const mousePosOnMap = transform.apply([mousePos.x, mousePos.y])
	// 		const neighbors = quadtree.find(d3Pointer[0], d3Pointer[1], 10);
	// 		console.log('Neighbors to mouse: ', neighbors);
	// 	}
	// }

	// $: mousePos, testVis();

	// $: if (mousePos) { console.log(transform.apply([mousePos.x, mousePos.y])); }
    // $: boxTopLeftX = viewboxTopLeft[0] - 100 / transform.k;
    // $: boxBottomRightX = viewboxBottomRight[0] + 100 / transform.k;
    $: boxTopLeftX = viewboxTopLeft[0];
    $: boxBottomRightX = viewboxBottomRight[0];

    let callCount = 0;
    
    function mapTiler(point) {
        if (point[0] < viewboxTopLeft[0] && viewboxBottomRight[0] > mapRealRightEdge) {
            return [point[0] + mapRealWidth, point[1]]
        } else if (point[0] > viewboxBottomRight[0] && viewboxTopLeft[0] < mapRealLeftEdge) {
            return [point[0] - mapRealWidth, point[1]]
        }

        return point
    }

    $: console.log('called: ', callCount)

    const unprojectedWidth = projection.invert(mapRealWidth, 0)

    function shiftBBoxMapWidth(bbox, x) {
        return [bbox[0]+unprojectedWidth[0]*x, bbox[1], bbox[2]+unprojectedWidth[0]*x, bbox[3]]
    }
</script>

<svelte:window
	on:mousemove={handleMousemove}
	bind:innerWidth={clientX}
	bind:innerHeight={clientY}
/>

<div class="overlay">
	<div style="width: 240px;">
		Zoom: {transform.k}
	</div>
	{#each zoomLevels as level, i}
		<div style="background: {level.hasRun ? 'blue' : 'gray'}">
			|{i}| k:{level.k} r:{level.radius}
		</div>
	{/each}
</div>
<div class="overlay" style="width: 100%; left: auto; bottom: 1rem; top: auto; height: 10px; padding: 0; background: black;">
    <div style="background: #343434; min-width: {mapRealWidth}px; min-height: 10px; position: absolute; left: {mapRealLeftEdge}px;"></div>
    <div style="background: lime; min-width: 1px; min-height: 10px; position: absolute; left: {mapRealLeftEdge}px;"></div>
    <div style="background: lime; min-width: 1px; min-height: 10px; position: absolute; left: {mapRealRightEdge}px;"></div>
    {#key airports}
        <div style="background: {pointIsInViewbox(mapTiler([mapRealLeftEdge+25, 200])) ? 'lime' : 'red'}; min-width: 2px; min-height: 10px; position: absolute; left: {mapTiler([mapRealLeftEdge+25, 0])[0]}px;"></div>
        <div style="background: {pointIsInViewbox(mapTiler([mapRealRightEdge-25, 200])) ? 'lime' : 'red'}; min-width: 2px; min-height: 10px; position: absolute; left: {mapTiler([mapRealRightEdge-25, 0])[0]}px;"></div>
    {/key}

	<div style="background: white; min-width: 1px; min-height: 10px; position: absolute; left: {boxBottomRightX}px;"></div>
    <div style="background: white; min-width: 1px; min-height: 10px; position: absolute; left: {boxTopLeftX}px;"></div>
</div>
<div style="left: {mousePos?.x + 10}px; top: {mousePos?.y + 10}px" class="tooltip">
	<div class="tooltip-country">
		<img alt="United States" src="./src/lib/flags/real/{hovered?.properties.WB_A2}.svg" />{hovered
			?.properties.NAME_EN ?? ''}
	</div>
	<div>
		Population: {hovered?.properties.POP_EST?.toLocaleString() ?? ''}
	</div>
</div>

<svg bind:this={svg} width={clientX} height={clientY} viewBox="0 0 {clientX} {clientY}">
	<g shape-rendering="auto" {transform} fill="white" stroke="black">
		{#each dataset as data, i}
            <!-- {#if bboxIntersectsViewbox(data.bbox)} -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
            <!-- <g transform="translate({mapTiler(projection(data.properties.center))[0] - projection(data.properties.center)[0]}, 0)"> -->
                <path
                    on:click={() => {
                        selected = data;

                        countryNamesDataset = countryNamesDataset;
                    }}
                    on:mouseover={() => {
                        hovered = data;
                    }}
                    d={path(data)}
                    fill={computeColor(data.properties.POP_EST, data.properties.MAPCOLOR7)}
                    stroke="none"
                    class="country"
                />
            <!-- </g> -->
            <!-- {/if} -->
		{/each}
        {#if viewboxTopLeft[0] < mapRealLeftEdge}
            {console.log('loaded in new map')}
            <g transform="translate({-mapRealWidth}, 0)">
                {#each dataset as data, i}
                    <!-- {#if bboxIntersectsViewbox(shiftBBoxMapWidth(data.bbox, -1))} -->

                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <!-- <g transform="translate({mapTiler(projection(data.center.geometry.coordinates))[0] - projection(data.center.geometry.coordinates)[0]}, 0)"> -->
                        <path
                            on:click={() => {
                                selected = data;

                                countryNamesDataset = countryNamesDataset;
                            }}
                            on:mouseover={() => {
                                hovered = data;
                            }}
                            d={path(data)}
                            fill={computeColor(data.properties.POP_EST, data.properties.MAPCOLOR7)}
                            stroke="none"
                            class="country"
                        />
                    <!-- </g> -->
                    <!-- {/if} -->
                {/each}
            </g>
        {/if}
        {#if viewboxBottomRight[0] > mapRealRightEdge}
            {console.log('loaded in new map')}
            <g transform="translate({mapRealWidth}, 0)">
                {#each dataset as data, i}
                    <!-- {#if bboxIntersectsViewbox(shiftBBoxMapWidth(data.bbox, 1))} -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <!-- <g transform="translate({mapTiler(projection(data.center.geometry.coordinates))[0] - projection(data.center.geometry.coordinates)[0]}, 0)"> -->
                        <path
                            on:click={() => {
                                selected = data;

                                countryNamesDataset = countryNamesDataset;
                            }}
                            on:mouseover={() => {
                                hovered = data;
                            }}
                            d={path(data)}
                            fill={computeColor(data.properties.POP_EST, data.properties.MAPCOLOR7)}
                            stroke="none"
                            class="country"
                        />
                    <!-- {/if} -->
                    <!-- </g> -->
                {/each}
            </g>
        {/if}
        <!-- {#if transform.k > zoomLevels[7].k} 
            {#each urbanAreas.features as data}
                <path d={path(data)} fill="#FCFBF3" stroke="none" class="country" />
            {/each}
        {/if} -->
		{#if transform.k > zoomLevels[2].k}
			{#each boundaryLinesStates as boundaryLine}
				{#if pointIsInViewbox(mapTiler(projection(boundaryLine.center.geometry.coordinates)))}
                    <g transform="translate({mapTiler(projection(boundaryLine.center.geometry.coordinates))[0] - projection(boundaryLine.center.geometry.coordinates)[0]}, 0)">
                        <path
                            d={path(boundaryLine)}
                            fill="none"
                            stroke="#D6ADC1"
                            stroke-width={0.5 / transform.k}
                            class="country"
                        />
                    </g>
				{/if}
			{/each}
		{/if}
		{#if transform.k > zoomLevels[1].k}
			{#each boundaryLines as boundaryLine}
                <g transform="translate({mapTiler(projection(boundaryLine.center.geometry.coordinates))[0] - projection(boundaryLine.center.geometry.coordinates)[0]}, 0)">
                    <path
                        d={path(boundaryLine)}
                        fill="none"
                        stroke="#D6ADC1"
                        stroke-width={1 / transform.k}
                        class="country"
                    />
                </g>
			{/each}
		{/if}
		{#if selected}
			<path
				bind:this={activeCountry}
				d={path(selected)}
				fill="none"
				stroke="white"
				stroke-width={1 / transform.k}
			/>
			<!-- <path d={path(selected.properties.center)} stroke="white" /> -->

			<!-- <text
                bind:this={countryLabel}
                x={projection(selected.properties.center.geometry.coordinates)[0]}
                y={projection(selected.properties.center.geometry.coordinates)[1]}
                fill="white"
                font-family="Arial"
                class="country-label">{selected.properties.NAME_EN}</text
            > -->
		{/if}
		{#if true}
			{#each airports.features as airport}
				{#if airport.properties.visible}
					{#if pointIsInViewbox(projection(airport.properties.center))}
						{#if transform.k > 70}
							<svg
								x={projection(airport.properties.center)[0] - 1 / 2}
								y={projection(airport.properties.center)[1] - 1 / 2}
								width="1px"
								height="1px"
								viewBox="0 0 13 13"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect
									x="2.17847"
									y="0.646447"
									width="14.5"
									height="2.16667"
									transform="rotate(45 2.17847 0.646447)"
									fill="#584D75"
									stroke="#FBF0E7"
									stroke-width="0.5"
								/>
								<rect
									x="2.17847"
									y="1.47144"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 2.17847 1.47144)"
									fill="white"
									stroke="none"
								/>
								<rect
									x="1.85449"
									y="1.79553"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 1.85449 1.79553)"
									fill="white"
									stroke="none"
								/>
								<rect
									x="1.55981"
									y="2.09009"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 1.55981 2.09009)"
									fill="white"
									stroke="none"
								/>
								<rect
									x="10.929"
									y="10.2218"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 10.929 10.2218)"
									fill="white"
									stroke="none"
								/>
								<rect
									x="10.6047"
									y="10.5459"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 10.6047 10.5459)"
									fill="white"
									stroke="none"
								/>
								<rect
									x="10.3103"
									y="10.8406"
									width="1"
									height="0.208333"
									rx="0.104167"
									transform="rotate(45 10.3103 10.8406)"
									fill="white"
									stroke="none"
								/>
								<path
									d="M3.20972 2.62048L3.3509 3.32641C3.35382 3.34099 3.34096 3.35384 3.32639 3.35092L2.62046 3.20974"
									stroke="#ECBB5C"
									stroke-width="0.208333"
									stroke-linecap="round"
								/>
								<path
									d="M3.94629 3.35706L4.08747 4.06298C4.09039 4.07756 4.07754 4.09041 4.06296 4.0875L3.35703 3.94631"
									stroke="#ECBB5C"
									stroke-width="0.208333"
									stroke-linecap="round"
								/>
							</svg>
						{:else}
							<svg
								x={projection(airport.properties.center)[0] - Math.max(18 / transform.k, 1) / 2}
								y={projection(airport.properties.center)[1] - Math.max(18 / transform.k, 1) / 2}
								width={Math.max(18 / transform.k, 1)}
								height={Math.max(18 / transform.k, 1)}
								viewBox="0 0 30 30"
								fill="none"
								style="pointer-events: none;"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
									fill="#7A4E6A"
									stroke="white"
								/>
							</svg>
						{/if}
					{/if}
				{/if}
			{/each}
		{/if}
		{#each cityNamesDataset as data (data.properties.ne_id)}
			{#if data.properties.visible}
				<!-- {#if pointIsInViewbox(mapTiler(projection(data.properties.center)))} -->
					<!-- <path d={path(data)} fill="none" stroke="black" stroke-width="0.1" /> -->

					<text
						x={mapTiler(projection(data.properties.center))[0]}
						y={mapTiler(projection(data.properties.center))[1] - 12 / transform.k}
						font-size={(10 + 5 * (data.properties.pop_min / 14608512)) / transform.k}
						stroke-width={(1.32 + 0.66 * (data.properties.pop_min / 14608512)) / transform.k}
						class="city-name">{data.properties.name}</text
					>
					<circle
						cx={mapTiler(projection(data.properties.center))[0]}
						cy={mapTiler(projection(data.properties.center))[1]}
						r={(1.5 + 1.5 * (data.properties.pop_min / 14608512)) / transform.k}
						fill="white"
						stroke="black"
						stroke-width={(0.75 + 0.75 * (data.properties.pop_min / 14608512)) / transform.k}
					/>
				<!-- {/if} -->
			{/if}
		{/each}
		{#each stateNamesDataset as data}
			{#if data.properties.visible}
				<!-- {#if pointIsInViewbox(projection(data.properties.center))} -->
					<text
						x={projection(data.properties.center)[0]}
						y={projection(data.properties.center)[1]}
						font-size={7 / transform.k}
						stroke-width={2 / transform.k}
						fill="#814b6c"
						stroke="#eef6e8"
						class="country-name">{data.properties.postal}</text
					>
				<!-- {/if} -->
			{/if}
		{/each}
		{#each countryNamesDataset as data (data.properties.NE_ID)}
			{#if data.properties.visible || data.properties.NAME_EN === selected?.properties.NAME_EN}
				<!-- {#if pointIsInViewbox(mapTiler(projection(data.properties.center)))} -->
					<!-- font-size={15 / transform.k} -->

					<text
						x={mapTiler(projection(data.properties.center))[0]}
						y={mapTiler(projection(data.properties.center))[1]}
						font-size={12 / transform.k}
						stroke-width={2 / transform.k}
						fill={data.properties.NAME_EN === selected?.properties.NAME_EN ? '#0085FF' : '#814b6c'}
						stroke={data.properties.NAME_EN === selected?.properties.NAME_EN ? 'white' : '#eef6e8'}
						class="country-name">{data.properties.NAME_EN}</text
					>
				<!-- {/if} -->
			{/if}
		{/each}

		<!-- <circle
			cx={projection([mousePos?.x, mousePos?.y])[0]}
			cy={projection([mousePos?.x, mousePos?.y])[1]}
			r="100"
			fill="red"
		/> -->
		<!-- <circle
			cx={viewboxTopLeft[0] + 300 / transform.k}
			cy={viewboxTopLeft[1] + 100 / transform.k}
			r="10"
			fill="red"
			stroke="blue"
		/>
		<circle
			cx={viewboxBottomRight[0] - 300 / transform.k}
			cy={viewboxBottomRight[1] - 100 / transform.k}
			r="10"
			fill="red"
			stroke="blue"
		/> -->
	</g>
</svg>

<style>
	.overlay {
		position: absolute;
		background-color: black;
		color: white;
		padding: 1rem;
		display: flex;
		gap: 6px;
		justify-content: center;
		top: 1rem;
		left: 1rem;
	}

	.tooltip {
		position: absolute;
		background-color: black;
		color: white;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	/* .tooltip-country {
		display: flex;
		align-items: center;
		height: 2rem;
		gap: 0.5rem;
	}

	.tooltip-country > * {
		object-fit: contain;
		height: 100%;
	} */

	.city-name {
		/* font-size: 2px; */
		font-weight: 700;
		fill: #282828;
		paint-order: stroke;
		stroke: #eef6e8;
		/* stroke-linecap: butt;
		stroke-linejoin: miter; */
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}

	.country-name {
		/* font-size: 2px; */
		font-weight: 700;
		/* fill: #814b6c; */
		paint-order: stroke;
		/* stroke: #eef6e8; */
		/* stroke-linecap: butt;
		stroke-linejoin: miter; */
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}

	.country-label {
		font-size: 3px;
		background: black;
		fill: white;
		stroke: none;
		text-anchor: middle;
		dominant-baseline: central;
	}

	.country {
		/* transition: 250ms; */
	}

	.country:hover {
		/* fill: #549460; */
		opacity: 0.5;
	}

	svg {
		/* background: rgb(37, 36, 36); */
		background: #92d4f9;
	}

	path {
		/* fill: gray; */
		/* stroke: white; */
	}
</style>
