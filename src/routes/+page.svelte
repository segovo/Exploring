<script>
	import { json } from 'd3';
	// import { geoPath, geoNaturalEarth1, select } from 'd3';
	import * as d3 from 'd3';
	import { onMount, tick } from 'svelte';
	import { draw } from 'svelte/transition';
	import * as topojsonClient from 'topojson-client';
	import { geoPatterson, geoRobinson } from 'd3-geo-projection';
	import _ from 'lodash';
	import * as turf from '@turf/turf';
	// import * as simpleWorldMap from '$lib/map/simpleworld.json';
	// import * as complexWorldMap from '$lib/map/world.json';
	import * as worldMap from '$lib/map/world.json';
	// import * as veryComplexWorldMap from '$lib/map/ne_10m_admin_0_countries.json';

	// import * as countryJson from '$lib/data/countries.json';
	import * as countryJson from '$lib/data/mergedData.json';
	import * as countryCenters from '$lib/data/countrycenters.json';
	import * as importAirports from '$lib/data/airports/ne_10m_airports.json';
	import airportIcon from '$lib/icons/airport.svg';

	let airports = importAirports;
	const topojson = worldMap;
	const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	// const geojson = simpleWorldMap;

	const dataset = geojson.features;
	let countryNamesDataset = geojson.features;

	const countryData = Object.entries(countryJson.default);

	countryData.forEach((country) => {
		const index = dataset.findIndex((d) => d.properties.name == country[0]);

		if (index !== -1) {
			dataset[index].properties.color = country[1].color;
			dataset[index].properties.population = country[1].population;
			dataset[index].properties.ISO2 = country[1].ISO2;
		}
	});

	let largestArea = 0;
	dataset.forEach((geojson) => {
		geojson.properties.area = turf.area(geojson);
		if (geojson.properties.area > largestArea) {
			// console.log('! geojson : ', geojson);
			largestArea = geojson.properties.area;
		}

		const countryCenter = countryCenters.features.find(
			(country) => country.properties.ISO === geojson.properties.ISO2
		);
		if (countryCenter) {
			// console.log('Country center: ', countryCenter);
			geojson.properties.center = countryCenter;
		} else {
			geojson.properties.center = turf.centerOfMass(geojson);
		}
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

	function zoomed(e) {
		const t = e.transform;
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
	// $: console.log('datad3 ', transform);
	let zoom = d3
		.zoom()
		.scaleExtent([2, 128])
		.translateExtent(mapSize)
		.on('zoom', zoomed)
		.clickDistance(10);

	// .translateExtent(mapSize)
	$: path = d3.geoPath(projection);
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

	const colors = ['#D7F5A7', '#C3E9A0', '#BCDC89', '#FDF0E6'];

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

	function computeColor(population, color) {
		if (population) {
			return colors[color];
		} else {
			return '#3E3A3A';
		}
	}

	$: strokeWidth = transform.k > 4 ? 4 / transform.k : 0;

	// $: console.log(transform.k);
	// $: console.log(transform.x / transform.k, transform.y / transform.k);
	$: zoomLevel = (transform.k - 1) / 127;
	// $: console.log('zoomLevel: ', zoomLevel);

	const quadtree = d3
		.quadtree()
		.x((d) => d.x)
		.y((d) => d.y);

	airports.features.forEach((airport) => {
		let pointData = {};

		pointData.x = projection(airport.geometry.coordinates)[0];
		pointData.y = projection(airport.geometry.coordinates)[1];
		pointData.airport = airport;
		pointData.type = 'airport';

		// airport.projectedCoords = coords;
		// console.log('un: ', airport.geometry.coordinates)

		quadtree.add(pointData);
	});

	countryNamesDataset.forEach((point) => {
		let pointData = {};
		pointData.x = projection(point.properties.center.geometry.coordinates)[0];
		pointData.y = projection(point.properties.center.geometry.coordinates)[1];
		pointData.point = point;
		pointData.type = 'country';
		quadtree.add(pointData);
	});

	const zoomLevels = [
		{ k: 2.1, radius: 20, hasRun: false },
		{ k: 3, radius: 16, hasRun: false },
		{ k: 3.5, radius: 12, hasRun: false },
		{ k: 4, radius: 8, hasRun: false },
		{ k: 6, radius: 7, hasRun: false },
		{ k: 8, radius: 6, hasRun: false },
		{ k: 16, radius: 1.5, hasRun: false },
		{ k: 32, radius: 0, hasRun: false }
	];
	// const zoomLevels = [
	// 	{ k: 2.1, radius: 16, hasRun: false },
	// 	{ k: 2.3, radius: 12, hasRun: false },
	// 	{ k: 4.1, radius: 12, hasRun: false },
	// 	{ k: 4.3, radius: 8, hasRun: false },
	//     { k: 8.1, radius: 6, hasRun: false },
	// 	{ k: 8.3, radius: 2, hasRun: false },
	//     { k: 16.1, radius: 2, hasRun: false },
	//     { k: 16.3, radius: 0, hasRun: false },

	// ];
	let searchRadius;
	let removedPoints = [];

	function setVisibility(point) {
		// console.log(quadtree.size());
		quadtree.remove(point);
		const neighbor = quadtree.find(point.x, point.y, searchRadius);
		if (neighbor) {
			if (point.type === 'airport') {
				point.airport.invisible = true;
				removedPoints.push(point);
			} else if (point.type === 'country') {
				if (neighbor.type === 'airport') {
					neighbor.airport.invisible = true;
					quadtree.remove(neighbor);
					// removedPoints.push(neighbor);
					quadtree.add(point);
					setVisibility(point);
					// quadtree.add(point);
				} else {
					point.point.properties.visible = false;
					removedPoints.push(point);
				}
			}
		} else {
			quadtree.add(point);
			if (point.type === 'airport') {
				point.airport.invisible = false;
			} else if (point.type === 'country') {
				point.point.properties.visible = true;
			}
		}
	}

	function updateAirportVisibilities(scale) {
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
				// let removedPoints = [];
				console.error('starting: ', quadtree.size());

				removedPoints = [];
				const data = quadtree.data();
				data.forEach((point) => {
					setVisibility(point);
				});

				quadtree.addAll(removedPoints);
				removedPoints = [];
				// removedPoints.forEach((removedPoints) => {
				// 	quadtree.add(removedPoints);
				// });

				if (level.hasRun === false && transform.k > level.k) {
					level.hasRun = true;
				} else if (level.hasRun && transform.k < level.k) {
					level.hasRun = false;
				}

				airports = airports;
				countryNamesDataset = countryNamesDataset;

				// console.log(dataset);
				// airports = airports;
			}
		});
	}

	$: updateAirportVisibilities(transform.k);
	$: console.log('zoomlevels: ', zoomLevels);

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
</script>

<svelte:window
	on:mousemove={handleMousemove}
	bind:innerWidth={clientX}
	bind:innerHeight={clientY}
/>

<div class="overlay">
	Country: {selected?.properties.name ?? ''}
</div>
<div style="left: {mousePos?.x + 10}px; top: {mousePos?.y + 10}px" class="tooltip">
	<div class="tooltip-country">
		<img alt="United States" src="./src/lib/flags/real/{hovered?.properties.ISO2}.svg" />{hovered
			?.properties.name ?? ''}
	</div>
	<div>
		Population: {hovered?.properties.population?.toLocaleString() ?? ''}
	</div>
</div>

<svg bind:this={svg} width={clientX} height={clientY} viewBox="0 0 {clientX} {clientY}">
	<g shape-rendering="auto" {transform} fill="white" stroke="black">
		{#each dataset as data, i}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<path
				on:click={() => {
					selected = data;
				}}
				on:mouseover={() => {
					hovered = data;
				}}
				d={path(data)}
				fill={computeColor(data.properties.population, data.properties.color)}
				stroke="none"
				class="country"
			/>
		{/each}
		{#each countryNamesDataset as data, i}
			<!-- font-size={(((data.properties.area / largestArea) * 5) + 2) * (4 / transform.k)} -->
			<!-- font-size="{Math.max(((data.properties.area / largestArea) + (4 / transform.k))/2, 0.1)}px" -->
			<!-- size = 0.01   0.23  0.45           -->
			<!-- {console.log('data.properties.area: ', data.properties.area / largestArea)} -->
			<!-- {#if 10 / transform.k < 4 || data.properties.area / largestArea > 0.06} -->
			<!-- font-size={10 / transform.k} -->
			= {#if data.properties.visible}
				<text
					x={projection(data.properties.center.geometry.coordinates)[0]}
					y={projection(data.properties.center.geometry.coordinates)[1]}
					font-size={15 / transform.k}
					stroke-width={2 / transform.k}
					class="country-name">{data.properties.name}</text
				>
			{/if}
			<!-- {/if} -->
		{/each}
		{#if strokeWidth != 0}
			{#each airports.features as airport}
				{#if zoomLevel > 1}
					<svg
						x={projection(airport.geometry.coordinates)[0] - 1 / 2}
						y={projection(airport.geometry.coordinates)[1] - 1 / 2}
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
					<!-- <path d={path(airport)} fill="none" stroke="black" stroke-width={strokeWidth} /> -->
				{/if}
			{/each}
		{/if}

		{#if true}
			{#each airports.features as airport}
				{#if airport.invisible}{:else}
					<!-- 6.835 -->
					<svg
						x={projection(airport.geometry.coordinates)[0] - 18 / transform.k / 2}
						y={projection(airport.geometry.coordinates)[1] - 18 / transform.k / 2}
						width={18 / transform.k}
						height={18 / transform.k}
						viewBox="0 0 30 30"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
							fill="#7A4E6A"
							stroke="white"
						/>
					</svg>
				{/if}
			{/each}
		{/if}

		{#if selected}
			<!-- 549460 -->

			<path
				bind:this={activeCountry}
				d={path(selected)}
				fill="none"
				stroke="white"
				stroke-width={3 / transform.k}
			/>
			<!-- <path d={path(selected.properties.center)} stroke="white" /> -->

			<!-- <text
				bind:this={countryLabel}
				x={projection(selected.properties.center.geometry.coordinates)[0]}
				y={projection(selected.properties.center.geometry.coordinates)[1]}
				fill="white"
				font-family="Arial"
				class="country-label">{selected.properties.name}</text
			> -->
		{/if}

		<!-- <circle
			cx={projection([mousePos?.x, mousePos?.y])[0]}
			cy={projection([mousePos?.x, mousePos?.y])[1]}
			r="100"
			fill="red"
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

	.country-name {
		/* font-size: 2px; */
		font-weight: 700;
		fill: #814b6c;
		paint-order: stroke;
		stroke: #eef6e8;
		/* stroke-linecap: butt;
		stroke-linejoin: miter; */
		text-anchor: middle;
		dominant-baseline: central;
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
		opacity: 0.8;
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
