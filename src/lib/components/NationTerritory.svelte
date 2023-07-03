<script>
    export let nation
    export let transform
    export let path
    export let mapRealWidth
</script>

<path d={path(nation.border)} fill="none" stroke={nation.color} stroke-width={1/transform.k} />
{#each nation.countries as country}
    <path d={path(country)} fill={nation.fill} stroke="none" opacity={2/transform.k} />
{/each}

<g transform="translate({-mapRealWidth}, 0)">
    <path d={path(nation.border)} fill="none" stroke={nation.color} stroke-width={1/transform.k} />
    {#each nation.countries as country}
        <path d={path(country)} fill={nation.fill} stroke="none" opacity={2/transform.k} />
    {/each}
</g>

<g transform="translate({mapRealWidth}, 0)">
    <path d={path(nation.border)} fill="none" stroke={nation.color} stroke-width={1/transform.k} />
    {#each nation.countries as country}
        <path d={path(country)} fill={nation.fill} stroke="none" opacity={2/transform.k} />
    {/each}
</g>
