<script>
    import * as d3 from 'd3';
	import * as turf from '@turf/turf';
    import { interpolate } from '$lib/utils';
	import Options from '$lib/components/Options.svelte';
	import Option from '$lib/components/Option.svelte';

	export let jetSelected;
	export let moveUI;
    export let activeHudItem;
	export let transform;
	export let projection;

	export let nations;
	export let movingEntities;

	export function move(jet) {
		if (jet.guard.guarding && jet.guard.circling) {
            const x = jet.guard.center[0] + jet.guard.radius * Math.cos(jet.guard.angle);
            const y = jet.guard.center[1] + jet.guard.radius * Math.sin(jet.guard.angle);
            const jetPosition = [x, y];
            jet.location = jetPosition
            jet.target = jetPosition
            jet.rotation = 45 - (jet.guard.angle * 180 / Math.PI) + 180
        } else {
            jet.targetDistance = jet.targetDistance + 0.005/jet.pointDistance
            jet.location = interpolate(jet.startLocation, jet.target, jet.targetDistance)
            jet.rotation = turf.bearing(jet.location, jet.target) + 45
        }

        if (jet.waypoints.moving) {
            const projectedPoints = jet.waypoints.points.map(point => projection(point))
            projectedPoints.unshift(projection(jet.location))
            jet.waypoints.path = d3.line()(projectedPoints)
        }

        if (Math.sqrt(Math.pow(jet.target[0] - jet.location[0], 2) + Math.pow(jet.target[1] - jet.location[1], 2)) < 0.1) {
            if (jet.patrol.patrolling) {
                jet.patrol.nextPoint++
            } 
            if (jet.guard.guarding) {
                jet.guard.angle -= 0.01
                if (jet.guard.angle <= -2 * Math.PI) {
                    jet.guard.angle = 0; // Reset angle once a full circle is completed
                }
            }
            if (jet.waypoints.moving) {
                if (jet.waypoints.points.length) {
                    jet.waypoints.points.splice(0, 1)
                    if (!jet.waypoints.points.length) {
                        jet.waypoints.moving = false
                        jet.waypoints.path = ''
                    }
                }
            }

            if (!jet.guard.guarding) {
                stop(jet)
            }
        }
        nations = nations   
	}

   export function stop(jet) {
        movingEntities.splice(movingEntities.indexOf(jet), 1)
        jet.startLocation = []
        jet.target = []
        jet.targetDistance = 0
        movingEntities = movingEntities
    }

    export function addWaypoint(jet, location) {
        jet.waypoints.points = [...jet.waypoints.points, location]
        const projectedPoints = jet.waypoints.points.map(point => projection(point))
        projectedPoints.unshift(projection(jet.location))
        jet.waypoints.path = d3.line()(projectedPoints)
        jet.waypoints.moving = true;

        if (jet.guard.guarding) {
            jet.guard.guarding = false;
            stop(jet)
            jet.location = jet.guard.center
        }
        
        jet.patrol.patrolling = false;
        jetSelected = jetSelected;
    }

	function optionGuard() {
        activeHudItem = ''
        if (jetSelected.guard.guarding) {
            jetSelected.guard.guarding = false;
            stop(jetSelected)
            jetSelected.location = jetSelected.guard.center
        } else {
            jetSelected.guard.guarding = true;
            jetSelected.guard.center = structuredClone(jetSelected.location)
            jetSelected.waypoints.points = []
            jetSelected.waypoints.path = ''
            jetSelected.waypoints.moving = false;
            stop(jetSelected)
        }

        nations = nations
    }

    function optionMoveJet() {
        activeHudItem = ''
        if (jetSelected.waypoints.moving) {
            moveUI = false
            jetSelected.waypoints.points = []
            jetSelected.waypoints.path = ''
            jetSelected.waypoints.moving = false;
            stop(jetSelected)
        } else {
            moveUI = true
        }
    }
</script>

{#if jetSelected && jetSelected.type === 'jet' && !moveUI}
    <Options {transform} {projection} location={jetSelected.location}>
        {#if !jetSelected.waypoints.moving}
            <Option onClick={optionGuard}>
                <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6.01343 0.611969L6 0.606934L0 2.85693V8.10693C0 12.6069 6 15.6069 6 15.6069C6 15.6069 6.00456 15.6047 6.01343 15.6001V0.611969Z" fill="#7CBBFF"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6.01343 0.611969L6.02685 0.606934L12.0239 2.85693V8.10693C12.0239 12.6069 6.02685 15.6069 6.02685 15.6069C6.02685 15.6069 6.02229 15.6047 6.01343 15.6001V0.611969Z" fill="#2B91FF"/>
                </svg>
                {#if jetSelected.guard.guarding}
                    Cancel
                {:else}
                    Guard
                {/if}
            </Option>
        {/if}
        <Option onClick={optionMoveJet}>
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
            {#if jetSelected.waypoints.moving}
                Cancel
            {:else}
                Move
            {/if}
        </Option>
    </Options>
{/if}