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

	let airports = importAirports;
	const geojson = neworldMap;

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

	geojson.features.forEach((geojson) => {
		geojson.bbox = turf.bbox(geojson);
	});

	let boundaryLines = [];
	neboundaryLines.features.forEach((geojson, i) => {
		const chunks = turf.lineChunk(geojson, 1000);
		chunks.features.forEach((chunk) => {
			chunk.center = turf.centroid(chunk);
			boundaryLines.push(chunk);
		});
	});

	let boundaryLinesStates = [];
	neboundaryLinesStates.geometries.forEach((geojson, i) => {
		const chunks = turf.lineChunk(geojson, 200);
		chunks.features.forEach((chunk) => {
			chunk.center = turf.centroid(chunk);
			boundaryLinesStates.push(chunk);
		});
	});

	let largestArea = 0;
	dataset.forEach((geojson) => {
		geojson.properties.area = turf.area(geojson);
		if (geojson.properties.area > largestArea) {
			largestArea = geojson.properties.area;
		}

		geojson.properties.center = [geojson.properties.LABEL_X, geojson.properties.LABEL_Y];
	});

	function getArrayDepth(obj) {
		if (Array.isArray(obj)) return 1 + Math.max(...obj.map((t) => getArrayDepth(t)));
		else return 0;
	}

	let svg;
	let d3Svg;
	let transform = d3.zoomIdentity;

	function zoomed(e) {
		const t = e.transform;

		if (0 - t.x / t.k > mapRealRightEdge) {
			t.x = -(0 - t.x - mapRealWidth * t.k);
			// transform.x = -(leftEdge - (mapWidth * zoom))
		} else if (clientX / t.k - t.x / t.k < mapRealLeftEdge) {
			t.x = -(0 - t.x + mapRealWidth * t.k);
			// transform.x = -(leftEdge + (mapWidth * zoom))
		}

		transform = t;
		if (e.sourceEvent) mousePos = { x: e.sourceEvent.clientX, y: e.sourceEvent.clientY };
	}

	let projection = geoPatterson();

	const mapSize = d3
		.geoPath()
		.projection({ stream: (stream) => projection.stream(stream) })
		.bounds(geojson);
	console.log('mapSize', mapSize);

	const mapRealLeftEdge = mapSize[0][0];
	const mapRealRightEdge = mapSize[1][0];
	const mapRealWidth = mapSize[1][0] - mapSize[0][0];

	// mapSize[0][0] = mapSize[0][0] - 200;
	// mapSize[1][0] = mapSize[1][0] + 200;

	const mapWidth = mapSize[1][0] - mapSize[0][0];
	const mapHeight = mapSize[1][1] - mapSize[0][1];

	let zoom = d3
		.zoom()
		.scaleExtent([2, 1024])
		.translateExtent([
			[mapSize[0][0] - mapRealWidth * 2, mapSize[0][1]],
			[mapSize[1][0] + mapRealWidth * 2, mapSize[1][1]]
		])
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

	onMount(async () => {
		d3Svg = d3.select(svg);
		d3Svg.call(zoom);
		d3.zoomIdentity.k = 3;
		d3.zoomIdentity.x = -720;
		d3.zoomIdentity.y = -170;
		transform = d3.zoomIdentity;
		requestAnimationFrame(loop);
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
	// $: selected, addBGToLabel();

	// async function addBGToLabel() {
	// 	console.log('SELF EXECUTING: ', selected?.properties?.name.toString());
	// 	if (!svg) {
	// 		return;
	// 	}

	// 	await tick();

	// 	if (!activeCountry) {
	// 		return;
	// 	}
	// 	if (countryLabelBG) {
	// 		countryLabelBG.remove();
	// 	}

	// 	console.log('Running: ', selected?.properties?.name.toString());

	// 	const text = d3.select(countryLabel);
	// 	const parent = d3.select(countryLabel.parentNode);
	// 	const bbox = text.node().getBBox();

	// 	d3.select(activeCountry);
	// 	const padding = 1;

	// 	countryLabelBG = parent
	// 		.insert('rect', 'text')
	// 		.attr('x', bbox.x - padding)
	// 		.attr('y', bbox.y - padding)
	// 		.attr('rx', '1px')
	// 		.attr('ry', '1px')
	// 		.attr('width', bbox.width + padding * 2)
	// 		.attr('height', bbox.height + padding * 2)
	// 		.style('fill', '#40814C')
	// 		.style('border-radius', '5px')

	// 		.style('stroke', 'none');
	// }

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

	let tier1data = [];
	let tier2data = [];
	let tier3data = [];

	countryNamesDataset.sort((a, b) => (a.properties.POP_EST < b.properties.POP_EST ? -1 : 1));
	countryNamesDataset.forEach((point) => {
		let pointData = {};
		pointData.x = projection(point.properties.center)[0];
		pointData.y = projection(point.properties.center)[1];
		pointData.point = point;
		pointData.type = 'tier1';
		// pointData.point.properties.labelrank = point.properties.LABELRANK - 1;

		tier1data.push(pointData);
	});

	// cityNamesDataset.sort((a, b) => (a.properties.labelrank > b.properties.labelrank ? -1 : 1));
	// cityNamesDataset.splice(0, cityNamesDataset.length - 300);
	// console.log('cityNamesDataset: ', cityNamesDataset);

	// cityNamesDataset.forEach((point) => {
	// 	let pointData = {};
	// 	pointData.x = projection(point.geometry.coordinates)[0];
	// 	pointData.y = projection(point.geometry.coordinates)[1];
	// 	point.properties.center = point.geometry.coordinates;
	// 	pointData.point = point;
	// 	pointData.type = 'tier2';

	// 	tier2data.push(pointData);
	// });

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

	// airports.features.forEach((airport) => {
	// 	let pointData = {};
	// 	pointData.x = projection(airport.geometry.coordinates)[0];
	// 	pointData.y = projection(airport.geometry.coordinates)[1];
	// 	airport.properties.center = airport.geometry.coordinates;
	// 	pointData.point = airport;
	// 	pointData.type = 'tier3';

	// 	tier3data.push(pointData);
	// });

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
        playerCities = playerCities
	}

	function screenToVirtual(point, transform) {
		// const x = (0 - transform.x) / transform.k - mapWidth / 2;
		// const y = (0 - transform.y) / transform.k - mapHeight / 2;
		const x = point.x / transform.k - transform.x / transform.k;
		const y = point.y / transform.k - transform.y / transform.k;
		return [x, y];
	}

	$: viewboxTopLeft = screenToVirtual({ x: 0, y: 0 }, transform);
	$: viewboxBottomRight = screenToVirtual({ x: clientX, y: clientY }, transform);

	function pointIsInViewbox(point) {
		return (
			point[0] >= viewboxTopLeft[0] &&
			point[0] <= viewboxBottomRight[0] &&
			point[1] >= viewboxTopLeft[1] &&
			point[1] <= viewboxBottomRight[1]
		);
	}

	function bboxIntersectsViewbox(bbox) {
		let bboxTopLeft = projection([bbox[0], bbox[3]]);
		let bboxBottomRight = projection([bbox[2], bbox[1]]);

		return !(
			viewboxTopLeft[0] > bboxBottomRight[0] ||
			viewboxBottomRight[0] < bboxTopLeft[0] ||
			viewboxTopLeft[1] > bboxBottomRight[1] ||
			viewboxBottomRight[1] < bboxTopLeft[1]
		);
	}

	let prevViewboxCoords = [0, 0];
	function updateDisplayedPoints() {
		const currentViewboxCoords = [0 - transform.x / transform.k, 0 - transform.y / transform.k];

		const distanceX = Math.abs(currentViewboxCoords[0] - prevViewboxCoords[0]);
		const distanceY = Math.abs(currentViewboxCoords[1] - prevViewboxCoords[1]);

		if (distanceX > 100 / transform.k || distanceY > 100 / transform.k) {
			// console.log('View box moved by more than 100 units.');
			updateVisibilities();
			prevViewboxCoords = currentViewboxCoords;
			boundaryLinesStates = boundaryLinesStates;
			boundaryLines = boundaryLines;
		} else {
			updateAirportVisibilities(transform.k);
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

	function mapTiler(point) {
		if (point[0] < viewboxTopLeft[0] && viewboxBottomRight[0] > mapRealRightEdge) {
			return [point[0] + mapRealWidth, point[1]];
		} else if (point[0] > viewboxBottomRight[0] && viewboxTopLeft[0] < mapRealLeftEdge) {
			return [point[0] - mapRealWidth, point[1]];
		}

		return point;
	}

	const unprojectedWidth = projection.invert(mapRealWidth, 0);

	function shiftBBoxMapWidth(bbox, x) {
		return [bbox[0] + unprojectedWidth[0] * x, bbox[1], bbox[2] + unprojectedWidth[0] * x, bbox[3]];
	}

	const vigo = [-8.729995, 42.220019];
	const wilmington = [-77.94502, 34.225519];
	const newyork = [-73.995718, 40.721562];

    function genInterp(start, target) {
        const edgeThreshold = 0.1; // Adjust this value as needed

        const startLat = start[0];
        const startLon = start[1];
        const targetLat = target[0];
        const targetLon = target[1];

        const diffLon = Math.abs(targetLon - startLon);
        const isNearEdge = diffLon > 180 - edgeThreshold;

        const interpolateLinear = (frac) => {
            const newLat = startLat + (targetLat - startLat) * frac;
            const newLon = startLon + (targetLon - startLon) * frac;

            return [newLat, newLon];
        };

        const interpolateAroundEdge = (frac) => {
            const newLat = startLat + (targetLat - startLat) * frac;
            const newLon = frac < 0.5 ? targetLon - 360 : targetLon + 360;

            return [newLat, newLon];
        };

        return isNearEdge ? interpolateAroundEdge : interpolateLinear;
    }

	function interpolate(a, b, frac) {
        const interpolateProjection = genInterp(a, b);

        const interpolatedCoords = interpolateProjection(frac);

		// frac = Math.max(Math.min(frac, 1), 0);
		// var nx = a[0] + (b[0] - a[0]) * frac;
		// var ny = a[1] + (b[1] - a[1]) * frac;
		return interpolatedCoords;
	}

	let lastTickTime = performance.now();
	let lastAvgTickTime = performance.now();
	let avgTickLength = 0;
	let tickTime = 0;
	let tickDelta = 0;
	let currentTick = 0;

	const interval = setInterval(() => {
		currentTick++;
        
        let jetQuadtree = d3
			.quadtree()
			.x((d) => d.x)
			.y((d) => d.y);

        let friendlies = jetData.filter(jet => jet.point.properties.team === 2)
        let enemies = jetData.filter(jet => jet.point.properties.team === 1)

        jetQuadtree.addAll(enemies)

        friendlies.forEach(friendly => jetSearchForEnemies(friendly, jetQuadtree))

        // if (Math.floor(Math.random()*200) === 0) {
        //     playerCities.forEach((city) => {
        //         city.properties.population += city.properties.growthRate
        //     })
        //     console.log("playerCities: ", playerCities)
        //     playerCities = playerCities
        // }

        playerCities.forEach(city => city.tick(currentTick))
        playerCities = playerCities

        // if (currentTick % 600 === 0) {
        //     // Every 600 ticks or 30 seconds
        //     playerCities.forEach((city) => {
        //         city.properties.population += 1
        //         // playerGold += Math.floor(city.properties.population)
        //     }) 
            
        //     playerCities = playerCities
		// }


		tickTime = performance.now() - lastTickTime;
		lastTickTime = performance.now();

        // tickSamples.push({ tickTime: tickTime, time: performance.now(), zoom: transform.k })

		if (currentTick % 20 === 0) {
			avgTickLength = Math.round((performance.now() - lastAvgTickTime) / 20);
			lastAvgTickTime = performance.now();
		}
	}, 50);

	let shipLocation = [10, 10];
	let shipLocation2 = [10, 10];
	let shipLocation3 = [10, 10];
	let fps = 0;
	let frameCount = 0;
	let lastFpsTime = 0;
	let previousTime = 0;
	let deltaTime = 0;
	let distanceMoved = 0;

	function moveDistance(speed) {
		return speed * deltaTime;
	}

    // PERFORMANCE TESTING
    // let fpsSamples = [] 
    // let tickSamples = []

    function jetSearchForEnemies(jet, jetQuadtree) {
        const neighbor = jetQuadtree.find(jet.x, jet.y, 10);
        if (neighbor) {
            if (movingObjects.indexOf(jet.point) === -1) {
                jet.point.properties.startLocation = jet.point.properties.location
                jet.point.properties.target = neighbor.point.properties.location
                jet.point.properties.pointDistance = Math.sqrt(Math.pow(jet.point.properties.target[0] - jet.point.properties.location[0], 2) + Math.pow(jet.point.properties.target[1] - jet.point.properties.location[1], 2))
                jet.point.properties.targetDistance = 0;
                movingObjects.push(jet.point)
            }
        }
    }
 
	function loop() {
		frameCount++;

		deltaTime = (performance.now() - previousTime) / 1000;
		previousTime = performance.now();

		let elapsed = performance.now() - lastFpsTime;

		if (elapsed >= 1000) {
			fps = Math.round(frameCount / (elapsed / 1000));
            // fpsSamples.push({ fps: fps, time: performance.now(), zoom: transform.k })
			lastFpsTime = performance.now();
			frameCount = 0;

            // console.log(fpsSamples, tickSamples)
		}

		distanceMoved = distanceMoved + moveDistance(0.1);
		shipLocation = interpolate(vigo, wilmington, distanceMoved % 1.1);
		shipLocation2 = interpolate(wilmington, vigo, distanceMoved % 1.1);
		shipLocation3 = interpolate(newyork, vigo, distanceMoved % 1.1);

        movingObjects.forEach(object => {
            object.move()
        })  

		requestAnimationFrame(loop);
	}

	// $: shipLocation = interpolate(vigo, wilmington, currentTick/20 % 1.1)
	// $: shipLocation2 = interpolate(wilmington, vigo, currentTick/20 % 1.1)
	// $: shipLocation3 = interpolate(newyork, vigo, currentTick/20 % 1.1)
	$: ships = [shipLocation, shipLocation2, shipLocation3];

	let mousePos;
	let d3Pointer;
	function handleMousemove(e) {
		d3Pointer = transform.invert(d3.pointer(e, svg));
		// console.log('D3 POINTER proj: ', d3Pointer);
		// console.log('non: ', e.clientX, e.clientY)
		// console.log('mousemove: ', projection([e.clientX, e.clientY])[0], projection([e.clientX, e.clientY])[1]);
		mousePos = { x: e.clientX, y: e.clientY };
	}

    let playerCredits = 500000;
    let cityCost = 5;
    let playerCities = []
    let jetCost = 10;
    let playerJets = []
    let tikibarCost = 10;
    let playerTikiBars = []
    let id = 0;
    let jetSelected
    const citiesUsed = []

    let enemyJets = [
    { 
        properties: {
            team: 2,
            nation: 'BR',
            location: [-63.49332721318746, 9.16254689921207],
            startLocation: [],
            target: [],
            targetDistance: 0,
            pointDistance: 0
        },
        move() {
            this.properties.targetDistance = this.properties.targetDistance + 0.01/this.properties.pointDistance
            this.properties.location = interpolate(this.properties.startLocation, this.properties.target, this.properties.targetDistance)
            if (Math.sqrt(Math.pow(this.properties.target[0] - this.properties.location[0], 2) + Math.pow(this.properties.target[1] - this.properties.location[1], 2)) < 0.1) {
                movingObjects.splice(movingObjects.indexOf(this), 1)
                this.properties.startLocation = []
                this.properties.target = []
                this.properties.targetDistance = 0
            }
            enemyJets = enemyJets
        }
    },
    {
        properties: {
            team: 2,
            nation: 'BR',
            location: [-78.08945788447889, 2.0829045368274346],
            startLocation: [],
            target: [],
            targetDistance: 0,
            pointDistance: 0
        },
        move() {
            this.properties.targetDistance = this.properties.targetDistance + 0.01/this.properties.pointDistance
            this.properties.location = interpolate(this.properties.startLocation, this.properties.target, this.properties.targetDistance)
            if (Math.sqrt(Math.pow(this.properties.target[0] - this.properties.location[0], 2) + Math.pow(this.properties.target[1] - this.properties.location[1], 2)) < 0.1) {
                movingObjects.splice(movingObjects.indexOf(this), 1)
                this.properties.startLocation = []
                this.properties.target = []
                this.properties.targetDistance = 0
            }
            enemyJets = enemyJets
        }
    }
    ]

    let jetData = []
	enemyJets.forEach((jet) => {
		let pointData = {};
		pointData.x = projection(jet.properties.location)[0];
		pointData.y = projection(jet.properties.location)[1];
		pointData.point = jet;

		jetData.push(pointData);
	});


    const movingObjects = []

    $: console.log('playerJets: ', playerJets)

    function handleClick(e) {
        console.log(jetSelected)
        if (jetSelected) {
            jetSelected.properties.startLocation = jetSelected.properties.location
            jetSelected.properties.target = projection.invert(transform.invert(d3.pointer(e, svg)))
            jetSelected.properties.pointDistance = Math.sqrt(Math.pow(jetSelected.properties.target[0] - jetSelected.properties.location[0], 2) + Math.pow(jetSelected.properties.target[1] - jetSelected.properties.location[1], 2))
            jetSelected.properties.targetDistance = 0;
            if (movingObjects.indexOf(jetSelected) === -1) {
                movingObjects.push(jetSelected)
            }
            jetSelected = ''
            return
        }

        if (activeHudItem.name === 'Tiki Bar' && playerCredits >= activeHudItem.cost) {
            playerCredits -= activeHudItem.cost
            activeHudItem.cost += 5
            hudItems = hudItems

            // activeHudItem = ''

            playerTikiBars = [...playerTikiBars, {
                properties: {
                    owner: 'Player',
                    location: projection.invert(transform.invert(d3.pointer(e, svg))),
                }
            }]

            return
        }

        if (activeHudItem.name === 'Jet' && playerCredits >= activeHudItem.cost) {
            playerCredits -= activeHudItem.cost
            activeHudItem.cost += 5
            hudItems = hudItems

            // activeHudItem = ''

            playerJets = [...playerJets, {
                properties: {
                    team: 1,
                    nation: 'USA',
                    location: projection.invert(transform.invert(d3.pointer(e, svg))),
                    startLocation: [],
                    target: [],
                    targetDistance: 0,
                    pointDistance: 0
                },
                move() {
                    this.properties.targetDistance = this.properties.targetDistance + 0.01/this.properties.pointDistance
                    this.properties.location = interpolate(this.properties.startLocation, this.properties.target, this.properties.targetDistance)
                    if (Math.sqrt(Math.pow(this.properties.target[0] - this.properties.location[0], 2) + Math.pow(this.properties.target[1] - this.properties.location[1], 2)) < 0.1) {
                        movingObjects.splice(movingObjects.indexOf(this), 1)
                        this.properties.startLocation = []
                        this.properties.target = []
                        this.properties.targetDistance = 0
                    }
                    playerJets = playerJets
                }
            }]

            let pointData = {};
            pointData.x = projection(playerJets[playerJets.length-1].properties.location)[0];
            pointData.y = projection(playerJets[playerJets.length-1].properties.location)[1];
            pointData.point = playerJets[playerJets.length-1];

            jetData.push(pointData);

            return
        }

        console.log('activeHud: ', activeHudItem)
        if (hovered) {
            if (activeHudItem.name === 'City' && playerCredits >= activeHudItem.cost) {
                playerCredits -= activeHudItem.cost
                activeHudItem.cost += 5
                hudItems = hudItems
      
                // activeHudItem = ''

                let citiesInCountry = cityNamesDataset.filter(city => city.properties.adm0_a3 === hovered.properties.ADM0_A3)
                citiesInCountry.reverse()
                let newCity = citiesInCountry.find(city => citiesUsed.every(c => c !== city.properties.ne_id))

                if (!newCity) {
                    newCity = { properties: { name: 'No more cities' }}
                } else {
                    citiesUsed.push(newCity.properties.ne_id)
                }

                const center = projection.invert(transform.invert(d3.pointer(e, svg)))

                playerCities = [...playerCities, {
                    properties: {
                        name: newCity.properties.name,
                        nameLength: newCity.properties.name.length,
                        population: 1,
                        ticked: 0,
                        ticksPerCredit: 100,
                        ticksPerGrowth: 1200,
                        growthRate: (Math.floor(Math.random()*10)/10)+1, // 1.0-2.0
                        center: center,
                        visible: true,
                    },
                    tick() {
                        this.properties.ticked++ 
                        if (this.properties.ticked % this.properties.ticksPerCredit === 0) {
                            // playerCredits += Math.floor(this.properties.population/2) + 1
                            playerCredits += this.properties.population
                        }
                        if (this.properties.ticked % this.properties.ticksPerGrowth === 0) {
                            this.properties.population += 1
                        }
                    }
                }]

                let pointData = {};
                pointData.x = projection(center[0]);
                pointData.y = projection(center[1]);
                pointData.point = playerCities[playerCities.length - 1];
                tier1data.push(pointData);
                return
            }
        }
    }

    let debugMenu = false;
    function onKeyDown(e) {
        switch (e.key) {
            case '/':
                debugMenu = !debugMenu
                break;
            default:
                break;
        }
    }

    let activeHudItem;
    let hudItems = [
        {
            name: 'City',
            cost: 10,
        },
        {
            name: 'Tiki Bar',
            cost: 500
        },
        {
            name: 'Jet',
            cost: 100
        }
    ]

    function toggleItem(item) {
        if (activeHudItem === item) {
            activeHudItem = ''
        } else {
            activeHudItem = item
        }
    }
</script>

<svelte:window
	on:mousemove={handleMousemove}
    on:click={handleClick}
    on:keydown={onKeyDown}
	bind:innerWidth={clientX}
	bind:innerHeight={clientY}
/>

{#if debugMenu}
    <div style="height: 10px; background-color: black; width: 100%;">
        <div
            style="background: #343434; min-width: {mapRealWidth}px; min-height: 10px; position: absolute; left: {mapRealLeftEdge}px;"
        />
        <div
            style="background: lime; min-width: 1px; min-height: 10px; position: absolute; left: {mapRealLeftEdge}px;"
        />
        <div
            style="background: lime; min-width: 1px; min-height: 10px; position: absolute; left: {mapRealRightEdge}px;"
        />
        {#key airports}
            <div
                style="background: {pointIsInViewbox(mapTiler([mapRealLeftEdge + 25, 200]))
                    ? 'lime'
                    : 'red'}; min-width: 2px; min-height: 10px; position: absolute; left: {mapTiler([
                    mapRealLeftEdge + 25,
                    0
                ])[0]}px;"
            />
            <div
                style="background: {pointIsInViewbox(mapTiler([mapRealRightEdge - 25, 200]))
                    ? 'lime'
                    : 'red'}; min-width: 2px; min-height: 10px; position: absolute; left: {mapTiler([
                    mapRealRightEdge - 25,
                    0
                ])[0]}px;"
            />
        {/key}

        <div
            style="background: white; min-width: 1px; min-height: 10px; position: absolute; left: {boxBottomRightX}px;"
        />
        <div
            style="background: white; min-width: 1px; min-height: 10px; position: absolute; left: {boxTopLeftX}px;"
        />
    </div>
    <div>
        {#each zoomLevels as level, i}
            <span style="background: {level.hasRun ? 'cyan' : 'lightgray'}">
                |{i}| k:{level.k} r:{level.radius}
            </span>
        {/each}
    </div>
    <div>
        currentTick {currentTick} | avgTickLength {avgTickLength}ms | tickTime {Math.round(tickTime)}ms |
        Zoom {transform.k.toFixed(1)} | frameCount {frameCount} | fps {fps}
    </div>

    {#key hovered}
        <div
            style="left: {hovered?.properties.ship != null
                ? ships[hovered?.properties?.ship][0] - transform.x
                : mousePos?.x + 10}px; top: {hovered?.properties.ship != null
                ? ships[hovered?.properties?.ship][1]
                : mousePos?.y + 10}px"
            class="tooltip"
        >
            <div class="tooltip-country">
                <img alt="United States" src="./src/lib/flags/real/{hovered?.properties.WB_A2}.svg" />{hovered
                    ?.properties.NAME_EN ?? ''}
            </div>
            <!-- <div>
            Population: {hovered?.properties.POP_EST?.toLocaleString() ?? ''}
        </div> -->
        </div>
    {/key}
{/if}

<div class="top-hud">
    <div style="font-weight: 700; text-shadow: rgb(255, 255, 255) 1px 0px 0px, rgb(255, 255, 255) 0.540302px 0.841471px 0px, rgb(255, 255, 255) -0.416147px 0.909297px 0px, rgb(255, 255, 255) -0.989992px 0.14112px 0px, rgb(255, 255, 255) -0.653644px -0.756802px 0px, rgb(255, 255, 255) 0.283662px -0.958924px 0px, rgb(255, 255, 255) 0.96017px -0.279415px 0px;">
        UNITED STATES
    </div>
    <div class="hud-item" style="background: #00640A">
        Credits
        <span style="display: flex; align-items: center; gap: 4px;">
            {playerCredits}
            <svg width="14" height="14" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M5.97825 3.17472H7.84473C7.78507 2.66903 7.6487 2.22017 7.43564 1.82812C7.22541 1.43608 6.95268 1.10511 6.61746 0.835227C6.28223 0.5625 5.89728 0.355114 5.46263 0.213068C5.03081 0.0710227 4.56206 0 4.05638 0C3.28933 0 2.59899 0.176136 1.98535 0.528409C1.43691 0.840719 0.990581 1.28011 0.646377 1.84659H3.12865C3.41499 1.7036 3.73844 1.6321 4.09899 1.6321C4.34899 1.6321 4.58052 1.66761 4.79359 1.73864C5.0095 1.80966 5.19984 1.91193 5.36461 2.04545C5.52939 2.17898 5.66433 2.34091 5.76944 2.53125C5.87456 2.71875 5.94416 2.93324 5.97825 3.17472ZM2.18139 2.84659H0.206126C0.11503 3.15696 0.0528697 3.49029 0.0196455 3.84659H1.89995C1.94305 3.50857 2.02266 3.20649 2.13876 2.94034C2.15255 2.90852 2.16676 2.87727 2.18139 2.84659ZM1.873 4.84659H0C0.017836 5.20117 0.0622835 5.5345 0.133343 5.84659H2.05936C1.95903 5.55441 1.89691 5.22107 1.873 4.84659ZM2.70565 6.84659H0.487904C0.498255 6.86708 0.508768 6.88744 0.519443 6.90767C0.874557 7.57528 1.35751 8.08523 1.96831 8.4375C2.58194 8.78977 3.27797 8.96591 4.05638 8.96591C4.61603 8.96591 5.11745 8.8821 5.56064 8.71449C6.00666 8.54403 6.39018 8.31392 6.71121 8.02415C7.03507 7.73153 7.29217 7.40057 7.48251 7.03125C7.67569 6.65909 7.79643 6.27273 7.84473 5.87216L5.97825 5.86364C5.93564 6.09659 5.85893 6.30398 5.74814 6.4858C5.64018 6.66761 5.50382 6.82244 5.33905 6.95028C5.17427 7.07528 4.98535 7.17045 4.77228 7.2358C4.56206 7.30114 4.33336 7.33381 4.0862 7.33381C3.64586 7.33381 3.25808 7.22585 2.92285 7.00994C2.84663 6.96085 2.77423 6.9064 2.70565 6.84659Z" fill="white"/>
            </svg>
        </span>
    </div>
    {#each hudItems as item} 
        <div class="hud-item" style="background: {playerCredits >= item.cost ? (activeHudItem === item ? '#3087EC' : '#45444E') : '#747479'}" on:click|stopPropagation={() => toggleItem(item)}>
            {item.name} 
            <span style="display: flex; align-items: center; gap: 4px;">
                {item.cost}
                <svg width="14" height="14" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.97825 3.17472H7.84473C7.78507 2.66903 7.6487 2.22017 7.43564 1.82812C7.22541 1.43608 6.95268 1.10511 6.61746 0.835227C6.28223 0.5625 5.89728 0.355114 5.46263 0.213068C5.03081 0.0710227 4.56206 0 4.05638 0C3.28933 0 2.59899 0.176136 1.98535 0.528409C1.43691 0.840719 0.990581 1.28011 0.646377 1.84659H3.12865C3.41499 1.7036 3.73844 1.6321 4.09899 1.6321C4.34899 1.6321 4.58052 1.66761 4.79359 1.73864C5.0095 1.80966 5.19984 1.91193 5.36461 2.04545C5.52939 2.17898 5.66433 2.34091 5.76944 2.53125C5.87456 2.71875 5.94416 2.93324 5.97825 3.17472ZM2.18139 2.84659H0.206126C0.11503 3.15696 0.0528697 3.49029 0.0196455 3.84659H1.89995C1.94305 3.50857 2.02266 3.20649 2.13876 2.94034C2.15255 2.90852 2.16676 2.87727 2.18139 2.84659ZM1.873 4.84659H0C0.017836 5.20117 0.0622835 5.5345 0.133343 5.84659H2.05936C1.95903 5.55441 1.89691 5.22107 1.873 4.84659ZM2.70565 6.84659H0.487904C0.498255 6.86708 0.508768 6.88744 0.519443 6.90767C0.874557 7.57528 1.35751 8.08523 1.96831 8.4375C2.58194 8.78977 3.27797 8.96591 4.05638 8.96591C4.61603 8.96591 5.11745 8.8821 5.56064 8.71449C6.00666 8.54403 6.39018 8.31392 6.71121 8.02415C7.03507 7.73153 7.29217 7.40057 7.48251 7.03125C7.67569 6.65909 7.79643 6.27273 7.84473 5.87216L5.97825 5.86364C5.93564 6.09659 5.85893 6.30398 5.74814 6.4858C5.64018 6.66761 5.50382 6.82244 5.33905 6.95028C5.17427 7.07528 4.98535 7.17045 4.77228 7.2358C4.56206 7.30114 4.33336 7.33381 4.0862 7.33381C3.64586 7.33381 3.25808 7.22585 2.92285 7.00994C2.84663 6.96085 2.77423 6.9064 2.70565 6.84659Z" fill="white"/>
                </svg>
            </span>
        </div>
    {/each}
    <!-- <div class="hud-item" style="background: {activeHudItem === 'city' ? '#3087EC' : '#45444E'}" on:click|stopPropagation={() => { activeHudItem = 'city' }}>
        City {cityCost}
        <svg width="14" height="14" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.97825 3.17472H7.84473C7.78507 2.66903 7.6487 2.22017 7.43564 1.82812C7.22541 1.43608 6.95268 1.10511 6.61746 0.835227C6.28223 0.5625 5.89728 0.355114 5.46263 0.213068C5.03081 0.0710227 4.56206 0 4.05638 0C3.28933 0 2.59899 0.176136 1.98535 0.528409C1.43691 0.840719 0.990581 1.28011 0.646377 1.84659H3.12865C3.41499 1.7036 3.73844 1.6321 4.09899 1.6321C4.34899 1.6321 4.58052 1.66761 4.79359 1.73864C5.0095 1.80966 5.19984 1.91193 5.36461 2.04545C5.52939 2.17898 5.66433 2.34091 5.76944 2.53125C5.87456 2.71875 5.94416 2.93324 5.97825 3.17472ZM2.18139 2.84659H0.206126C0.11503 3.15696 0.0528697 3.49029 0.0196455 3.84659H1.89995C1.94305 3.50857 2.02266 3.20649 2.13876 2.94034C2.15255 2.90852 2.16676 2.87727 2.18139 2.84659ZM1.873 4.84659H0C0.017836 5.20117 0.0622835 5.5345 0.133343 5.84659H2.05936C1.95903 5.55441 1.89691 5.22107 1.873 4.84659ZM2.70565 6.84659H0.487904C0.498255 6.86708 0.508768 6.88744 0.519443 6.90767C0.874557 7.57528 1.35751 8.08523 1.96831 8.4375C2.58194 8.78977 3.27797 8.96591 4.05638 8.96591C4.61603 8.96591 5.11745 8.8821 5.56064 8.71449C6.00666 8.54403 6.39018 8.31392 6.71121 8.02415C7.03507 7.73153 7.29217 7.40057 7.48251 7.03125C7.67569 6.65909 7.79643 6.27273 7.84473 5.87216L5.97825 5.86364C5.93564 6.09659 5.85893 6.30398 5.74814 6.4858C5.64018 6.66761 5.50382 6.82244 5.33905 6.95028C5.17427 7.07528 4.98535 7.17045 4.77228 7.2358C4.56206 7.30114 4.33336 7.33381 4.0862 7.33381C3.64586 7.33381 3.25808 7.22585 2.92285 7.00994C2.84663 6.96085 2.77423 6.9064 2.70565 6.84659Z" fill="white"/>
        </svg>
    </div>
    <div class="hud-item" style="background: {playerCredits >= tikibarCost ? (activeHudItem === 'tikibar' ? '#3087EC' : '#45444E') : '#747479'}" on:click|stopPropagation={() => { activeHudItem = 'tikibar' }}>
        Tiki Bar {tikibarCost}
        <svg width="14" height="14" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.97825 3.17472H7.84473C7.78507 2.66903 7.6487 2.22017 7.43564 1.82812C7.22541 1.43608 6.95268 1.10511 6.61746 0.835227C6.28223 0.5625 5.89728 0.355114 5.46263 0.213068C5.03081 0.0710227 4.56206 0 4.05638 0C3.28933 0 2.59899 0.176136 1.98535 0.528409C1.43691 0.840719 0.990581 1.28011 0.646377 1.84659H3.12865C3.41499 1.7036 3.73844 1.6321 4.09899 1.6321C4.34899 1.6321 4.58052 1.66761 4.79359 1.73864C5.0095 1.80966 5.19984 1.91193 5.36461 2.04545C5.52939 2.17898 5.66433 2.34091 5.76944 2.53125C5.87456 2.71875 5.94416 2.93324 5.97825 3.17472ZM2.18139 2.84659H0.206126C0.11503 3.15696 0.0528697 3.49029 0.0196455 3.84659H1.89995C1.94305 3.50857 2.02266 3.20649 2.13876 2.94034C2.15255 2.90852 2.16676 2.87727 2.18139 2.84659ZM1.873 4.84659H0C0.017836 5.20117 0.0622835 5.5345 0.133343 5.84659H2.05936C1.95903 5.55441 1.89691 5.22107 1.873 4.84659ZM2.70565 6.84659H0.487904C0.498255 6.86708 0.508768 6.88744 0.519443 6.90767C0.874557 7.57528 1.35751 8.08523 1.96831 8.4375C2.58194 8.78977 3.27797 8.96591 4.05638 8.96591C4.61603 8.96591 5.11745 8.8821 5.56064 8.71449C6.00666 8.54403 6.39018 8.31392 6.71121 8.02415C7.03507 7.73153 7.29217 7.40057 7.48251 7.03125C7.67569 6.65909 7.79643 6.27273 7.84473 5.87216L5.97825 5.86364C5.93564 6.09659 5.85893 6.30398 5.74814 6.4858C5.64018 6.66761 5.50382 6.82244 5.33905 6.95028C5.17427 7.07528 4.98535 7.17045 4.77228 7.2358C4.56206 7.30114 4.33336 7.33381 4.0862 7.33381C3.64586 7.33381 3.25808 7.22585 2.92285 7.00994C2.84663 6.96085 2.77423 6.9064 2.70565 6.84659Z" fill="white"/>
        </svg>
    </div>
    <div class="hud-item" style="background: {activeHudItem === 'jet' ? '#3087EC' : '#45444E'}" on:click|stopPropagation={() => { activeHudItem = 'jet' }}>
        Jet {jetCost}
        <svg width="14" height="14" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.97825 3.17472H7.84473C7.78507 2.66903 7.6487 2.22017 7.43564 1.82812C7.22541 1.43608 6.95268 1.10511 6.61746 0.835227C6.28223 0.5625 5.89728 0.355114 5.46263 0.213068C5.03081 0.0710227 4.56206 0 4.05638 0C3.28933 0 2.59899 0.176136 1.98535 0.528409C1.43691 0.840719 0.990581 1.28011 0.646377 1.84659H3.12865C3.41499 1.7036 3.73844 1.6321 4.09899 1.6321C4.34899 1.6321 4.58052 1.66761 4.79359 1.73864C5.0095 1.80966 5.19984 1.91193 5.36461 2.04545C5.52939 2.17898 5.66433 2.34091 5.76944 2.53125C5.87456 2.71875 5.94416 2.93324 5.97825 3.17472ZM2.18139 2.84659H0.206126C0.11503 3.15696 0.0528697 3.49029 0.0196455 3.84659H1.89995C1.94305 3.50857 2.02266 3.20649 2.13876 2.94034C2.15255 2.90852 2.16676 2.87727 2.18139 2.84659ZM1.873 4.84659H0C0.017836 5.20117 0.0622835 5.5345 0.133343 5.84659H2.05936C1.95903 5.55441 1.89691 5.22107 1.873 4.84659ZM2.70565 6.84659H0.487904C0.498255 6.86708 0.508768 6.88744 0.519443 6.90767C0.874557 7.57528 1.35751 8.08523 1.96831 8.4375C2.58194 8.78977 3.27797 8.96591 4.05638 8.96591C4.61603 8.96591 5.11745 8.8821 5.56064 8.71449C6.00666 8.54403 6.39018 8.31392 6.71121 8.02415C7.03507 7.73153 7.29217 7.40057 7.48251 7.03125C7.67569 6.65909 7.79643 6.27273 7.84473 5.87216L5.97825 5.86364C5.93564 6.09659 5.85893 6.30398 5.74814 6.4858C5.64018 6.66761 5.50382 6.82244 5.33905 6.95028C5.17427 7.07528 4.98535 7.17045 4.77228 7.2358C4.56206 7.30114 4.33336 7.33381 4.0862 7.33381C3.64586 7.33381 3.25808 7.22585 2.92285 7.00994C2.84663 6.96085 2.77423 6.9064 2.70565 6.84659Z" fill="white"/>
        </svg>
    </div> -->
</div>


<svg class="map" bind:this={svg} width={clientX} height={clientY} viewBox="0 0 {clientX} {clientY}">
	<g shape-rendering="auto" {transform} fill="white" stroke="black">
		{#each dataset as data, i}
			<path
				on:click={() => {
					selected = data;

					countryNamesDataset = countryNamesDataset;
				}}
				on:mouseover={() => {
					hovered = data;
				}}
                on:mouseout={() => {
                    hovered = null
                }}
				d={path(data)}
				fill={computeColor(data.properties.POP_EST, data.properties.MAPCOLOR7)}
				stroke="none"
				class="country"
			/>
		{/each}

		{#if viewboxTopLeft[0] < mapRealLeftEdge}
			<g transform="translate({-mapRealWidth}, 0)">
				{#each dataset as data, i}
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
				{/each}
			</g>
		{/if}
		{#if viewboxBottomRight[0] > mapRealRightEdge}
			<g transform="translate({mapRealWidth}, 0)">
				{#each dataset as data, i}
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
					<g
						transform="translate({mapTiler(
							projection(boundaryLine.center.geometry.coordinates)
						)[0] - projection(boundaryLine.center.geometry.coordinates)[0]}, 0)"
					>
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
				<g
					transform="translate({mapTiler(projection(boundaryLine.center.geometry.coordinates))[0] -
						projection(boundaryLine.center.geometry.coordinates)[0]}, 0)"
				>
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

		<!-- {#if selected}
            <g transform="translate({mapTiler(projection(selected.properties.center))[0] - projection(selected.properties.center)[0]}, 0)">
                <path
                    bind:this={activeCountry}
                    d={path(selected)}
                    fill="none"
                    stroke="white"
                    stroke-width={1 / transform.k}
                />
            </g>
			<<path d={path(selected.properties.center)} stroke="white" /> -->

		<!-- <text
                bind:this={countryLabel}
                x={projection(selected.properties.center.geometry.coordinates)[0]}
                y={projection(selected.properties.center.geometry.coordinates)[1]}
                fill="white"
                font-family="Arial"
                class="country-label">{selected.properties.NAME_EN}</text
            > -->
		<!-- {/if} -->
		{#key airports}
			<svg
				on:mouseover={() => {
					hovered = {
						properties: {
							NAME_EN: 'F-16 (UNITED STATES)',
							WB_A2: 'US',
							ship: 0
						}
					};
				}}
				x={mapTiler(projection(shipLocation))[0] - Math.max(18 / transform.k, 0.2) / 2}
				y={mapTiler(projection(shipLocation))[1] - Math.max(18 / transform.k, 0.2) / 2}
				width={Math.max(18 / transform.k, 0.2)}
				height={Math.max(18 / transform.k, 0.2)}
				viewBox="0 0 30 30"
				fill="none"
				class="airplane"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
					fill="blue"
					stroke="white"
				/>
			</svg>
			<svg
				x={mapTiler(projection(shipLocation2))[0] - Math.max(18 / transform.k, 0.2) / 2}
				y={mapTiler(projection(shipLocation2))[1] - Math.max(18 / transform.k, 0.2) / 2}
				width={Math.max(18 / transform.k, 0.2)}
				height={Math.max(18 / transform.k, 0.2)}
				viewBox="0 0 30 30"
				fill="none"
				class="airplane"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
					fill="blue"
					stroke="white"
				/>
			</svg>
			<svg
				x={mapTiler(projection(shipLocation3))[0] - Math.max(18 / transform.k, 0.2) / 2}
				y={mapTiler(projection(shipLocation3))[1] - Math.max(18 / transform.k, 0.2) / 2}
				width={Math.max(18 / transform.k, 0.2)}
				height={Math.max(18 / transform.k, 0.2)}
				viewBox="0 0 30 30"
				fill="none"
				class="airplane"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
					fill="blue"
					stroke="white"
				/>
			</svg>
		{/key}
        <!-- {#each airports.features as airport}
            {#if airport.properties.visible}
                {#if pointIsInViewbox(projection(airport.properties.center))}
                    {#if transform.k > 256}
                        <svg
                            x={projection(airport.properties.center)[0] - 0.125}
                            y={projection(airport.properties.center)[1] - 0.125}
                            width="0.25px"
                            height="0.25px"
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
                            x={projection(airport.properties.center)[0] - Math.max(18 / transform.k, 0.2) / 2}
                            y={projection(airport.properties.center)[1] - Math.max(18 / transform.k, 0.2) / 2}
                            width={Math.max(18 / transform.k, 0.2)}
                            height={Math.max(18 / transform.k, 0.2)}
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
        {/each} -->
		<!-- {#each cityNamesDataset as data (data.properties.ne_id)}
			{#if data.properties.visible}
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
			{/if}
		{/each} -->

        {#each playerCities as data}
            {#if data.properties.visible}
            <text
                x={mapTiler(projection(data.properties.center))[0] - data.properties.nameLength / transform.k}
                y={mapTiler(projection(data.properties.center))[1] - 12 / transform.k}
                font-size={10 / transform.k}
                stroke-width={1 / transform.k}
                class="city-name">{data.properties.name}</text
            >
            <circle 
                cx={mapTiler(projection(data.properties.center))[0] - (12 + data.properties.nameLength) / transform.k}
                cy={mapTiler(projection(data.properties.center))[1] - 16 / transform.k} 
                r={8/transform.k}
                fill="#3087EC"
                stroke="none"
                     />
            <text
                x={mapTiler(projection(data.properties.center))[0] - (12 + data.properties.nameLength) / transform.k}
                y={mapTiler(projection(data.properties.center))[1] - 12 / transform.k} 
                font-size={10 / transform.k}
                stroke-width={1 / transform.k}
                class="city-pop">{Math.round(data.properties.population)}</text
                >
            <circle
                cx={mapTiler(projection(data.properties.center))[0]}
                cy={mapTiler(projection(data.properties.center))[1]}
                r={1.5 / transform.k}
                fill="white"
                stroke="black"
                stroke-width={0.75 / transform.k}
            />
            {/if}
        {/each}
        {#each playerTikiBars as tikiBar}
            <svg 
                x={mapTiler(projection(tikiBar.properties.location))[0] - 40 / transform.k / 2}
                y={mapTiler(projection(tikiBar.properties.location))[1] - 40 / transform.k / 2}
                width={40/transform.k}
                height={40/transform.k}
                stroke="none"
                viewBox="0 0 41 27" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
                <path fill-rule="evenodd" clip-rule="evenodd" d="M30.306 26.5905C30.2801 24.2225 30.4068 20.4453 30.872 16.7867C31.1046 14.9573 31.4236 13.1433 31.8555 11.5434C32.2841 9.95574 32.8383 8.52265 33.5689 7.49524L34.7598 8.34209C34.1777 9.16055 33.6783 10.398 33.2663 11.9242C32.8576 13.4381 32.5491 15.1813 32.3216 16.971C31.8664 20.5506 31.7418 24.2595 31.7672 26.5745L30.306 26.5905ZM10.6887 26.5905C10.7146 24.2225 10.5879 20.4453 10.1227 16.7867C9.8901 14.9573 9.5711 13.1433 9.13919 11.5434C8.71061 9.95574 8.15639 8.52265 7.42578 7.49524L6.23492 8.34209C6.81694 9.16055 7.31643 10.398 7.72843 11.9242C8.1371 13.4381 8.44556 15.1813 8.67313 16.971C9.12829 20.5506 9.25283 24.2595 9.22748 26.5745L10.6887 26.5905Z" fill="#DC9168"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M29.2077 1.27159C29.1138 1.66403 29.3558 2.05829 29.7482 2.15219C30.0872 2.23331 30.5586 2.47236 31.0856 2.86055C31.6014 3.24058 32.1232 3.72858 32.5632 4.25019C33.007 4.77636 33.3419 5.30625 33.5158 5.76521C33.5875 5.95432 33.6247 6.11083 33.6389 6.23917C33.0804 5.74802 32.3886 5.35914 31.6924 5.09364C30.4721 4.62828 28.9991 4.45025 27.8357 4.93935C27.4637 5.09573 27.2889 5.52406 27.4453 5.89604C27.6017 6.26802 28.03 6.4428 28.402 6.28642C29.0817 6.00067 30.1332 6.06297 31.1717 6.459C31.527 6.59446 31.853 6.75833 32.1395 6.93949C32.0097 7.0006 31.8832 7.07109 31.7608 7.1505C30.8749 7.72532 30.2423 8.73368 29.9969 9.93024C29.9158 10.3255 30.1705 10.7117 30.5658 10.7928C30.9611 10.8739 31.3472 10.6192 31.4283 10.2239C31.6103 9.33673 32.0569 8.70028 32.5562 8.37634C33.0325 8.06728 33.5914 8.0125 34.1724 8.32936L34.1779 8.31933C34.205 8.33687 34.2328 8.35572 34.2612 8.37595C34.5529 8.58352 34.8731 8.9113 35.1715 9.36813C35.7665 10.2788 36.2479 11.6625 36.2479 13.4739C36.2479 13.8774 36.575 14.2045 36.9785 14.2045C37.3821 14.2045 37.7092 13.8774 37.7092 13.4738C37.7092 11.4054 37.1591 9.73868 36.3948 8.56891C36.2881 8.40545 36.1765 8.25089 36.0611 8.10583C36.3666 8.09375 36.6699 8.13305 36.9647 8.22094C37.7384 8.45158 38.5116 9.0359 39.1149 10.0297C39.3243 10.3746 39.7737 10.4845 40.1186 10.2751C40.4636 10.0657 40.5734 9.61629 40.364 9.27136C39.605 8.02114 38.5585 7.17125 37.3822 6.82058C36.9764 6.69961 36.5622 6.64029 36.1481 6.6424C36.1931 6.61356 36.239 6.5856 36.2855 6.55856C36.9606 6.16661 37.651 6.0451 38.0842 6.14038C38.4783 6.22705 38.868 5.97784 38.9547 5.58374C39.0414 5.18964 38.7922 4.79989 38.3981 4.71322C37.4955 4.51472 36.4277 4.78628 35.5518 5.29487C35.3681 5.40155 35.1869 5.52203 35.0123 5.65573C34.9764 5.5156 34.9321 5.37886 34.8822 5.24735C34.6304 4.5827 34.1884 3.91051 33.6802 3.30804C33.1682 2.70101 32.5628 2.13383 31.9523 1.68405C31.3528 1.24242 30.6984 0.877043 30.0883 0.731041C29.6958 0.637138 29.3016 0.879149 29.2077 1.27159ZM11.7875 1.27159C11.8814 1.66403 11.6393 2.05829 11.2469 2.15219C10.9079 2.23331 10.4365 2.47236 9.90955 2.86055C9.39367 3.24058 8.87188 3.72858 8.43191 4.25019C7.9881 4.77636 7.65324 5.30625 7.4793 5.76521C7.40763 5.95432 7.37038 6.11083 7.35619 6.23917C7.91476 5.74802 8.60649 5.35914 9.30271 5.09364C10.523 4.62828 11.996 4.45025 13.1594 4.93935C13.5314 5.09573 13.7062 5.52406 13.5498 5.89604C13.3934 6.26802 12.9651 6.4428 12.5931 6.28642C11.9134 6.00067 10.8619 6.06297 9.82338 6.459C9.46815 6.59446 9.14213 6.75833 8.85566 6.93949C8.98545 7.0006 9.11189 7.07109 9.23428 7.1505C10.1202 7.72532 10.7528 8.73368 10.9983 9.93024C11.0793 10.3255 10.8246 10.7117 10.4293 10.7928C10.0341 10.8739 9.64789 10.6192 9.5668 10.2239C9.38482 9.33673 8.93817 8.70028 8.43891 8.37634C7.96259 8.06728 7.40372 8.0125 6.82272 8.32936L6.81725 8.31933C6.79012 8.33688 6.76233 8.35572 6.73391 8.37595C6.44226 8.58352 6.12206 8.9113 5.8236 9.36813C5.22864 10.2788 4.74722 11.6625 4.74721 13.4739C4.7472 13.8774 4.42009 14.2045 4.01657 14.2045C3.61305 14.2045 3.28594 13.8774 3.28594 13.4738C3.28596 11.4054 3.83604 9.73868 4.60027 8.56891C4.70707 8.40545 4.81858 8.25089 4.93399 8.10583C4.62849 8.09375 4.32518 8.13305 4.03038 8.22094C3.25676 8.45158 2.4835 9.0359 1.8802 10.0297C1.6708 10.3746 1.22142 10.4845 0.876488 10.2751C0.531555 10.0657 0.421688 9.61629 0.631088 9.27136C1.39008 8.02114 2.43663 7.17125 3.6129 6.82058C4.01867 6.69961 4.43296 6.64029 4.84706 6.6424C4.802 6.61356 4.75615 6.5856 4.70957 6.55856C4.03454 6.16661 3.34415 6.0451 2.91095 6.14038C2.51685 6.22705 2.1271 5.97784 2.04042 5.58374C1.95375 5.18964 2.20296 4.79989 2.59706 4.71322C3.49963 4.51472 4.56741 4.78628 5.44333 5.29487C5.62706 5.40155 5.80821 5.52203 5.98282 5.65573C6.01869 5.5156 6.06303 5.37885 6.11287 5.24735C6.36477 4.5827 6.80675 3.91051 7.31493 3.30804C7.82695 2.70101 8.4323 2.13383 9.04286 1.68405C9.64235 1.24242 10.2967 0.877043 10.9068 0.731041C11.2993 0.637138 11.6935 0.879149 11.7875 1.27159Z" fill="#8FB81C"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12.8764 13.2374H12.2348V18.7796H12.8764V13.2374ZM29.199 13.2375H28.5574V18.7797H29.199V13.2375ZM12.0271 19.7614H11.3855V25.9438L10.9731 25.9438C10.7968 25.9438 10.6538 26.0868 10.6538 26.2631C10.6538 26.4395 10.7968 26.5825 10.9731 26.5825H30.3987C30.5751 26.5825 30.718 26.4395 30.718 26.2631C30.718 26.0868 30.5751 25.9438 30.3987 25.9438L29.9861 25.9438V19.7614H29.3444V25.9438H12.0271V19.7614Z" fill="#E76E41"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5065 2.81824H26.9457C27.1264 2.81824 27.2929 2.91567 27.3815 3.07311L33.099 13.2375H8.35327L14.0707 3.07311C14.1593 2.91567 14.3259 2.81824 14.5065 2.81824ZM10.4977 14.724L12.5419 13.3103L14.5861 14.724L16.6304 13.3103L18.6746 14.724L20.7188 13.3103L22.763 14.724L24.8073 13.3103L26.8515 14.724L28.8959 13.3102L30.9403 14.724L33.0833 13.2419H28.9945H28.7972H24.9061H24.7085H20.8176H20.62H16.7292H16.5316H12.6407H12.4431H8.35464L10.4977 14.724Z" fill="#FFB44A"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M28.9291 5.82422H12.5233L12.2421 6.32422H29.2104L28.9291 5.82422ZM30.3943 8.42903H11.0581L10.7769 8.92903H30.6756L30.3943 8.42903Z" fill="#E76E41"/>
                <rect width="17.4562" height="6.18245" transform="matrix(-1 0 0 1 29.4839 19.7615)" fill="#FA8E46"/>
                <rect x="10.6538" y="18.7797" width="20.0642" height="0.981732" rx="0.490866" fill="#CE5F34"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M29.3444 21.0945H12.0274V22.0762H29.3444V21.0945ZM29.3443 23.6704H12.0273V24.6108H29.3443V23.6704Z" fill="#FEAF7A"/>
            </svg>            
        {/each}
        {#each enemyJets as jet}                    
            <svg
                x={mapTiler(projection(jet.properties.location))[0] - 18 / transform.k / 2}
                y={mapTiler(projection(jet.properties.location))[1] - 18 / transform.k / 2}
                width={18/transform.k}
                height={18/transform.k}
                viewBox="0 0 30 30"
                fill="none"
                class="airplane"
                xmlns="http://www.w3.org/2000/svg"
                transform="rotate(90, 50 50)"
            >
            
                <path
                    d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
                    fill="black"
                    stroke="white"
                />
            </svg>
            <svg 
            x={mapTiler(projection(jet.properties.location))[0] + 12 / transform.k / 2}
            y={mapTiler(projection(jet.properties.location))[1] - 56 / transform.k / 2}
            width={30/transform.k}
            height={30/transform.k}
            stroke="none"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#009b3a" d="M0 0h513v342H0z"/><path fill="#fedf00" d="m256.5 19.3 204.9 151.4L256.5 322 50.6 170.7z"/><circle fill="#FFF" cx="256.5" cy="171" r="80.4"/><path fill="#002776" d="M215.9 165.7c-13.9 0-27.4 2.1-40.1 6 .6 43.9 36.3 79.3 80.3 79.3 27.2 0 51.3-13.6 65.8-34.3-24.9-31-63.2-51-106-51zM334.9 186c.9-5 1.5-10.1 1.5-15.4 0-44.4-36-80.4-80.4-80.4-33.1 0-61.5 20.1-73.9 48.6 10.9-2.2 22.1-3.4 33.6-3.4 46.8.1 89 19.5 119.2 50.6z"/></svg>
            <!-- <image 
                x={mapTiler(projection(jet.properties.location))[0] + 12 / transform.k / 2}
                y={mapTiler(projection(jet.properties.location))[1] - 56 / transform.k / 2} 
                width={30/transform.k} 
                alt="Brazil" href="./src/lib/flags/simple/BR.svg" 
            /> -->
            <circle               
                cx={mapTiler(projection(jet.properties.location))[0]}
                cy={mapTiler(projection(jet.properties.location))[1]} 
                r={10}
                fill="transparent"
                stroke="red"
                opacity="0.5"
                stroke-width={1 / transform.k}
            />


        {/each}
        {#each playerJets as jet}                    
            <svg
                x={mapTiler(projection(jet.properties.location))[0] - 18 / transform.k / 2}
                y={mapTiler(projection(jet.properties.location))[1] - 18 / transform.k / 2}
                width={18/transform.k}
                height={18/transform.k}
                viewBox="0 0 30 30"
                fill="none"
                class="airplane"
                xmlns="http://www.w3.org/2000/svg"
                transform="rotate(90, 50 50)"
            >
                <path
                    d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
                    fill="{jetSelected === jet ? 'blue' : 'black'}"
                    stroke="white"
                />
            </svg>
            <circle               
                on:click|stopPropagation={() => {
                    jetSelected = jet
                }}  
                cx={mapTiler(projection(jet.properties.location))[0]}
                cy={mapTiler(projection(jet.properties.location))[1]} 
                r={20 / transform.k}
                fill="transparent"
                stroke="white"
                stroke-width={1 / transform.k}
                class="jet-helper"
            />
        {/each}
		{#each stateNamesDataset as data}
			{#if data.properties.visible}
				<text
					x={projection(data.properties.center)[0]}
					y={projection(data.properties.center)[1]}
					font-size={7 / transform.k}
					stroke-width={2 / transform.k}
					fill="#814b6c"
					stroke="#eef6e8"
					class="country-name">{data.properties.postal}</text
				>
			{/if}
		{/each}
		{#each countryNamesDataset as data (data.properties.NE_ID)}
			{#if data.properties.visible || data.properties.NAME_EN === selected?.properties.NAME_EN}
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
    
    .top-hud {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: left;
        gap: 8px;
        margin: 16px;
    }

    .hud-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        color: white;
        border-radius: 3px; 
        padding: 3px 12px 3px 12px;
    }

    .jet-helper:hover {
        fill: rgba(255, 255, 255, 0.2);
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
		/* text-anchor: middle; */
		/* dominant-baseline: central; */
		pointer-events: none;
	}


	.city-pop {
		font-weight: 700;
        text-anchor: middle;
		fill: white;
        stroke: none;
		pointer-events: none;
	}


	.city-population {
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

	/* .country:hover {
		opacity: 0.5;
	} */

	.map {
		/* background: rgb(37, 36, 36); */
		background: #92d4f9;
	}

	path {
		/* fill: gray; */
		/* stroke: white; */
	}
</style>
