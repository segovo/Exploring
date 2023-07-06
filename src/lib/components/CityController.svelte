<script>
    import * as d3 from 'd3';
    import { interpolate } from '$lib/utils';
	import Options from '$lib/components/Options.svelte';
	import Option from '$lib/components/Option.svelte';

	export let citySelected;
	// export let moveUI;
    // export let activeHudItem;
	export let transform;
	export let projection;

	// export let nations;
	// export let movingEntities;
</script>

{#if citySelected && citySelected.type === 'city'}
	<Options {transform} {projection} location={citySelected.location}>
		<Option onClick={() => {}}>
            Health {citySelected.health}
        </Option>
	</Options>
{/if}
