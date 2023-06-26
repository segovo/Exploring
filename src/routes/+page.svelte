<script>
	import { json } from 'd3';
	// import { geoPath, geoNaturalEarth1, select } from 'd3';
	import * as d3 from 'd3';
	import { onMount, tick } from 'svelte';
	import { draw } from 'svelte/transition';
	import * as topojsonClient from 'topojson-client';
	import { geoPatterson } from 'd3-geo-projection';
	import _ from 'lodash';
	import * as turf from '@turf/turf';
	// import * as simpleWorldMap from '$lib/map/simpleworld.json';
	import * as complexWorldMap from '$lib/map/world.json';
	import * as worldMap from '$lib/map/world.json';
	// import * as countryJson from '$lib/data/countries.json';
	import * as countryJson from '$lib/data/mergedData.json';
	import * as airports from '$lib/data/airports/ne_10m_airports.json';

	const topojson = worldMap;
	// const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	// const geojson = simpleWorldMap
	// const topojson = complexWorldMap;
	// const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	const dataset = geojson.features;
	const countryData = Object.entries(countryJson.default);

	countryData.forEach((country) => {
		const index = dataset.findIndex((d) => d.properties.name == country[0]);

		if (index !== -1) {
			dataset[index].properties.color = country[1].color;
			dataset[index].properties.population = country[1].population;
			dataset[index].properties.ISO2 = country[1].ISO2;
		}
	});

	dataset.forEach((geojson) => {
		// let max_area_polygon;
		// let max_area = 0;
		// let centerofmass;

		// console.log('geojson: ', geojson.geometry.coordinates);
		// geojson.geometry.coordinates.forEach((poly) => {
		// 	// for (let i = 0; i < poly.length; i++) {
		// 	// 	if (poly[i].length < 4) {
		// 	// 		poly.splice(i, 1);
		// 	// 		return;
		// 	// 	}
		// 	// }
		// 	console.log('pre');
		// 	const polygon = turf.polygon(poly);
		// 	console.log('poly set');
		// 	const area = turf.area(polygon);
		// 	console.log('area set');
		// 	if (area > max_area) {
		// 		max_area = area;
		// 		max_area_polygon = polygon; // polygon with the largest area
		// 	}
		// 	console.log('loop done');
		// });
		// center = turf.centerOfMass(max_area_polygon);
		// if (max_area_polygon) {
		// 	centerofmass = turf.centerOfMass(max_area_polygon);
		// } else {
		// 	centerofmass = turf.centerOfMass(geojson);
		// }

		// console.log('max_area_polygon: ', max_area_polygon);
		geojson.properties.center = turf.centerOfMass(geojson);
	});

	// const geometries = topojson.objects ? Object.values(topojson.objects)[0].geometries : undefined;
	// $: dataset = geometries ? _.zip(geojson.features, geometries) : [];
	// $: countryData = Object.values(topoMAP.objects)[0].geometries;
	// $: console.log(Object.entries(topoCOUNTRIES)[0]);
	// console.log(topoCOUNTRIES);
	// $: console.log(dataset[0]);
	// $: countryData = Object.entries(topoCOUNTRIES);
	// $: console.log(dataset[0]);
	let svg;
	let d3Svg;
	let scale = 1;
	let transform = d3.zoomIdentity;
	let mousePos;

	function handleMousemove(e) {
		console.log('mousemove');
		mousePos = { x: e.clientX, y: e.clientY };
	}

	function zoomed(e) {
		console.log('zoomed!');
		const t = e.transform;
		t.x = Math.min(clientX / 2, Math.max(t.x, clientX / 2 - clientX * t.k));
		t.y = Math.min(clientY / 2, Math.max(t.y, clientY / 2 - clientY * t.k));
		transform = t;
		if (e.sourceEvent) mousePos = { x: e.sourceEvent.clientX, y: e.sourceEvent.clientY };
	}

	let zoom = d3.zoom().scaleExtent([1, 50]).on('zoom', zoomed).clickDistance(10);

	// let dataset = [];
	// json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then(
	// 	(data) => {
	// 		dataset = data.features;
	// 	}
	// );

	// $: projection = d3
	// 	.geoNaturalEarth1()
	// 	.scale(clientY / 1 / Math.PI)
	// 	.translate([clientX / 2, clientY / 2]);
	// $: path = d3.geoPath(projection);
	let projection = geoPatterson();
	// $: path = d3.geoPath().projection({ stream: (stream) => projection.stream(stream) });
	$: path = getPath(scale);
	$: bounds = d3
		.geoPath()
		.projection({ stream: (stream) => projection.stream(stream) })
		.bounds(geojson);

	// $: bounds = d3.geoPath(projection).bounds(dataset);
	function getPath(s) {
		return d3
			.geoPath()
			.projection({ stream: (stream) => projection.stream(stream) })
			.pointRadius(0.01 * s);
	}

	function centerMap() {
		// const bounds = d3.geoPath(projection).bounds(dataset);

		scale =
			0.95 /
			Math.max((bounds[1][0] - bounds[0][0]) / clientX, (bounds[1][1] - bounds[0][1]) / clientY);
		projection
			.scale(scale)
			.translate([
				(clientX - scale * (bounds[1][0] + bounds[0][0])) / 2,
				(clientY - scale * (bounds[1][1] + bounds[0][1])) / 2
			]);
		// path = d3.geoPath(projection).pointRadius(0.01 * scale);
		// path = getPath(scale); // It's important to reset the path, otherwise an height change such as full screen might screw up the map

		if (clientX < 800) d3Svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
	}

	onMount(async () => {
		d3Svg = d3.select(svg);
		d3Svg.call(zoom);
		// centerMap();
	});

	let clientX;
	let clientY;

	$: console.log('zoomidentity ', transform);
	// $: console.log('dataset: ', dataset);
	// $: console.log('countryData: ', countryData[0]);
	$: console.log('selected: ', selected);
	let selected;
	let hovered;

	// const colors = ['#495AB5', '#2189B6', '#31AA1D', '#AA721D'];
	// const colors = ['#40814C', '#2A7037', '#1A6428', '#115A1E'];
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
			// return `rgba(150, 255, 150, ${(population / 1392730000) * 8 + 0.4}`;
		} else {
			return '#3E3A3A';
		}
	}

	$: strokeWidth = transform.k > 4 ? 2 / transform.k : 0;
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
        {#each dataset as data, i}
            <text
                x={projection(data.properties.center.geometry.coordinates)[0]}
                y={projection(data.properties.center.geometry.coordinates)[1]}
                class="country-name">{data.properties.name}</text
            >
        {/each}
		{#if strokeWidth !== 0}
			{#each airports.features as airport}
				<path d={path(airport)} fill="none" stroke="white" stroke-width={strokeWidth} />
			{/each}
		{/if}
		{#if selected}
			<!-- 549460 -->

			<path
				bind:this={activeCountry}
				d={path(selected)}
				fill="none"
				stroke="yellow"
				stroke-width={1 / transform.k}
			/>
			<!-- <path d={path(selected.properties.center)} stroke="white" /> -->

			<text
				bind:this={countryLabel}
				x={projection(selected.properties.center.geometry.coordinates)[0]}
				y={projection(selected.properties.center.geometry.coordinates)[1]}
				fill="white"
				font-family="Arial"
				class="country-label">{selected.properties.name}</text
			>
		{/if}
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
		font-size: 3px;
		font-weight: 700;
		fill: #814b6c;
		paint-order: stroke;
		stroke: #eef6e8;
		stroke-width: 0.2;
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
