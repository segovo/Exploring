<script>
	import { json } from 'd3';
	// import { geoPath, geoNaturalEarth1, select } from 'd3';
	import * as d3 from 'd3';
	import { onMount } from 'svelte';
	import { draw } from 'svelte/transition';
	import * as topojsonClient from 'topojson-client';
	import { geoPatterson } from 'd3-geo-projection';
	import _ from 'lodash';

	import * as worldMap from '$lib/map/world.json';
	import * as countryJson from '$lib/data/countries.json';

	// $: map = {
	// 	topojson: topoMAP,
	// 	name: 'World',
	// 	data: { topoCOUNTRIES }
	// };

	const topojson = worldMap;
	const geojson = topojsonClient.feature(topojson, Object.keys(topojson.objects)[0]);
	const dataset = geojson.features;
	const countryData = Object.entries(countryJson);

	countryData.forEach((country) => {
		console.log('country: ', country[0]);
		const index = dataset.findIndex((d) => d.properties.name === country[0]);
		if (index !== -1) {
			dataset[index].properties.color = country[1].color;
		}
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

	// $: console.log('dataset: ', dataset);
	// $: console.log('countryData: ', countryData[0]);
	$: console.log('selected: ', selected);
	let selected;

	const colors = ['red', 'blue', 'lime', 'cyan'];
</script>

<svelte:window
	on:mousemove={handleMousemove}
	bind:innerWidth={clientX}
	bind:innerHeight={clientY}
/>

<div class="overlay">Country: {selected?.properties.name ?? ''}</div>
<svg bind:this={svg} width={clientX} height={clientY} viewBox="0 0 {clientX} {clientY}">
	<g shape-rendering="auto" {transform} fill="white" stroke="black">
		{#each dataset as data, i}
			<!-- transition:draw={{ duration: 100, delay: i * 100 }} -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<path
				on:click={() => {
					selected = data;
				}}
				d={path(data)}
				fill={colors[data.properties.color]}
				stroke="gray"
				stroke-width={0.05}
				class="country"
			/>
		{/each}

		{#if selected}
			<path d={path(selected)} fill="blue" stroke="black" stroke-width={0.05} />
		{/if}
	</g>
</svg>

<style>
	.overlay {
		position: absolute;
		background-color: white;
		display: flex;
		justify-content: center;
		width: 100%;
	}

	.country {
		/* transition: 150ms; */
	}

	.country:hover {
		opacity: 0.5;
	}

	svg {
		background: lightblue;
	}

	path {
		/* fill: gray; */
		/* stroke: white; */
	}
</style>
