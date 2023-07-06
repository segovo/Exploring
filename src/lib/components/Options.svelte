<script>
	export let transform;
	export let projection;
	export let location;
</script>

<div
	style="
        position: absolute;
        left: {transform.apply(projection(location))[0] - 75}px;
        top: {transform.apply(projection(location))[1] - 60}px;
        display: flex;
        gap: 4px;
        padding: 4px;
        background: #2E2E2E;
        border-radius: 3px;
        "
>
	<slot />
</div>
