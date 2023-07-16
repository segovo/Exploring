<script>
	import * as d3 from 'd3';
	import { interpolate } from '$lib/utils';
	import Options from '$lib/components/Options.svelte';
	import Option from '$lib/components/Option.svelte';

	export let settlerSelected;
	export let moveUI;
	export let activeHudItem;
	export let transform;
	export let projection;

	export let nations;
	export let movingEntities;

	export function move(settler) {
		settler.targetDistance = settler.targetDistance + 0.01 / settler.pointDistance;
		settler.location = interpolate(settler.startLocation, settler.target, settler.targetDistance);

		if (settler.waypoints.moving) {
			const projectedPoints = settler.waypoints.points.map((point) => projection(point));
			projectedPoints.unshift(projection(settler.location));
			settler.waypoints.path = d3.line()(projectedPoints);
		}

		if (
			Math.sqrt(
				Math.pow(settler.target[0] - settler.location[0], 2) +
					Math.pow(settler.target[1] - settler.location[1], 2)
			) < 0.1
		) {
			if (settler.waypoints.moving) {
				if (settler.waypoints.points.length) {
					settler.waypoints.points.splice(0, 1);
					if (!settler.waypoints.points.length) {
						// settler.waypoints.moving = false;
						settler.waypoints.path = '';
					}
				}
			}
			stopSettler(settler);
		}
		nations = nations;
	}

	function stopSettler(settler) {
		movingEntities.splice(movingEntities.indexOf(settler), 1);
		settler.startLocation = [];
		settler.target = [];
		settler.targetDistance = 0;
		movingEntities = movingEntities;
	}

	export function setTarget(settler, location) {
		settler.waypoints.points = [location];
		const projectedPoints = settler.waypoints.points.map((point) => projection(point));
		projectedPoints.unshift(projection(settler.location));
		settler.waypoints.path = d3.line()(projectedPoints);
		settler.waypoints.moving = true;
	}

	function optionFoundCity() {
		activeHudItem = '';
		if (!settlerSelected.waypoints.moving) {
			nations[0].component.buildCity(settlerSelected.location);
			nations[0].settlers.splice(nations[0].settlers.indexOf(settlerSelected), 1);
			settlerSelected = null;
		}
	}

	function optionMoveSettler() {
		activeHudItem = '';
		if (settlerSelected.waypoints.moving) {
			moveUI = false;
			settlerSelected.waypoints.points = [];
			settlerSelected.waypoints.path = '';
			settlerSelected.waypoints.moving = false;
			stopSettler(settlerSelected);
		} else {
			moveUI = true;
		}
	}
</script>

{#if settlerSelected && settlerSelected.type === 'settler' && !moveUI}
	<Options {transform} {projection} location={settlerSelected.location}>
		{#if !settlerSelected.waypoints.moving}
			<Option onClick={optionFoundCity}>
				<svg
					width={14}
					height={14}
					viewBox="0 0 20 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="2.1213"
						width="10.6554"
						height="10.6554"
						transform="matrix(0.707105 -0.707109 0.707105 0.707109 0.912335 11.594)"
						fill="#1BA1FF"
						stroke="white"
						stroke-width="2.99998"
					/>
				</svg>
				Found City
			</Option>
		{/if}
		<Option onClick={optionMoveSettler}>
			<svg
				width={14}
				height={14}
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect
					x="2.1213"
					width="10.6554"
					height="10.6554"
					transform="matrix(0.707105 -0.707109 0.707105 0.707109 0.912335 11.594)"
					fill="#1BA1FF"
					stroke="white"
					stroke-width="2.99998"
				/>
			</svg>
			{#if settlerSelected.waypoints.moving}
				Cancel
			{:else}
				Move
			{/if}
		</Option>
	</Options>
{/if}
