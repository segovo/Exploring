<script>
	import * as d3 from 'd3';
	import * as turf from '@turf/turf';

	export let isPlayer;
	export let jetSelected;

	export let nation;
	export let nations;
	export let mapTiler;
	export let projection;
	export let transform;
	export let movingJets;
	export let cityNamesDataset;
	export let jetPatrolUI;
	export let activeHudItem;
    export let path;

	let enemyJetsQuadtree;
    let enemyJets;

	export function tick(currentTick) {
		if (currentTick % 20 === 0) {
			let otherNations = nations.filter((otherNation) => otherNation.team !== nation.team);
			enemyJets = otherNations.map((otherNation) => otherNation.jets);
			enemyJets = enemyJets.flat();
			enemyJetsQuadtree = d3
				.quadtree()
				.x((jet) => jet.location[0])
				.y((jet) => jet.location[1])
				.addAll(enemyJets);

			if (!isPlayer) {
				buildStuff();
			}

            // if (!isPlayer) {
            //     enemyJets.forEach(jet => {
            //         const isInside = turf.booleanPointInPolygon(jet.location, nation.border)
            //         if (isInside) {
            //             jetAttack(jet)
            //         }
            //     })
            // }
		}

		if (currentTick % 1 === 0) {
			nation.jets.forEach((jet) => searchForTargets(jet));
		}

		nation.jets.forEach((jet) => tickJet(jet));
		nation.cities.forEach((city) => tickCity(city));
	}

	function buildStuff() {
		const nextPurchase =
			nation.strategy.purchaseOrder[
				nation.strategy.purchaseIndex % nation.strategy.purchaseOrder.length
			];
		if (nextPurchase === 'city') {
			buildCity();
		} else if (nextPurchase === 'jet') {
			buildJet();
		}
	}

	export function buildCity(center) {
		if (nation.credits >= nation.items.city.cost) {
			nation.credits -= nation.items.city.cost;
			nation.items.city.cost += nation.items.city.costIncrease;

			let citiesInCountry = cityNamesDataset.filter(
				(city) => city.properties.adm0name === nation.name
			);
			citiesInCountry.reverse();
			let newCity = citiesInCountry.find((city) =>
				nation.citiesUsed.every((c) => c !== city.properties.ne_id)
			);

			if (!newCity) {
				newCity = { properties: { name: 'No more cities' } };
			} else {
				nation.citiesUsed.push(newCity.properties.ne_id);
			}

			if (!center) center = randomPointInRegion();

			nation.cities = [
				...nation.cities,
				{
					name: newCity.properties.name,
					nameLength: newCity.properties.name.length,
					population: 1,
					ticks: 0,
					ticksPerCredit: 100,
					ticksPerGrowth: 1200,
					growthRate: Math.floor(Math.random() * 10) / 10 + 1, // 1.0-2.0
					center: center,
					visible: true
				}
			];

			nation.strategy.purchaseIndex++;
		}
	}

	export function buildJet(location) {
		if (nation.credits >= nation.items.jet.cost) {
			// const mostPopulusCity = nation.cities.reduce((prev, current) => {
			// 	return prev.population > current.population ? prev : current;
			// });

			// if (mostPopulusCity.population <= 1) {
			// 	return;
			// }

			// mostPopulusCity.population -= 1;
			nation.credits -= nation.items.jet.cost;
			nation.items.jet.cost += nation.items.jet.costIncrease;

			if (!location) location = randomPointNearCity();

			nation.jets = [
				...nation.jets,
				{
					location: location,
                    rotation: 45,
					health: 100,
					guardMode: false,
					waypoints: {
						moving: false,
						points: [],
						path: ''
					},
					patrol: {
						patrolling: false,
						points: [],
						nextPoint: 0,
						path: '',
						endToStartPath: ''
					},
					startLocation: [],
					target: [],
					targetDistance: 0,
					pointDistance: 0
				}
			];

			console.log('Built jet!');
			nation.strategy.purchaseIndex++;
		}
	}

    function randomPointNearCity() {{
        const city = nation.cities[Math.floor(Math.random() * nation.cities.length)];
        // const radius = 1000;
        // const randomDistance = Math.max(Math.random() * radius, 100)
        const randomDistance = 300;
        const randomBearing = Math.random() * 360;
        const destination = turf.destination(city.center, randomDistance, randomBearing, { units: 'kilometers' });
        const randomPosition = destination.geometry.coordinates;
        // return destination.geometry.coordinates;
        // console.log(city.center)
        // const circle = turf.circle(city.center, 1, { steps: 5 });
        // const randomPosition = circle.geometry.coordinates[Math.floor(Math.random() * circle.geometry.coordinates.length)];
        // console.log(randomPosition)

        if (turf.booleanPointInPolygon(randomPosition, nation.geometry)) {
            return randomPosition;
        } else {
            return randomPointNearCity();
        }
    }}

	function randomPointInRegion() {
		const bbox = turf.bbox(nation.geometry);
		const randomPosition = turf.randomPosition(bbox);

		if (turf.booleanPointInPolygon(randomPosition, nation.geometry)) {
			return randomPosition;
		} else {
			return randomPointInRegion();
		}
	}

	let nextIndex = 0;

	function randomPointOnBorder() {
		const coordinates = nation.geometry.coordinates.flat(2);
		return coordinates[Math.floor(Math.random() * coordinates.length)];
	}

	function tickJet(jet) {
		if (jet.health <= 0) {
			nation.jets.splice(nation.jets.indexOf(jet), 1);
		}
	}
    
    // function jetAttack(attacker) {
    //     nation.jets.forEach(jet => {
    //         if (!movingJets.includes(jet)) {
    //             jet.startLocation = jet.location;
    //             jet.target = attacker.location;
    //             jet.pointDistance = Math.sqrt(
    //                 Math.pow(jet.target[0] - jet.location[0], 2) +
    //                     Math.pow(jet.target[1] - jet.location[1], 2)
    //             );
    //             jet.targetDistance = 0;
    //             movingJets.push(jet);
    //         }
    //     })
    // }

	function searchForTargets(jet, target) {
		let neighbor;

		if (enemyJetsQuadtree) {
			neighbor = enemyJetsQuadtree.find(jet.location[0], jet.location[1], 3.8);
		}

		if (neighbor) {
			if (!jet.patrol.patrolling || jet.guardMode) {
				target = neighbor.location;
				neighbor.health -= Math.random() * 5;
			}
		} else if (jet.patrol.patrolling) {
			target = jet.patrol.points[jet.patrol.nextPoint % jet.patrol.points.length];
		} else if (jet.waypoints.moving) {
			target = jet.waypoints.points[0];
		} else {
            // console.log(turf.circle(jet.location, 10, {steps: 5, units: 'kilometers'}))
        }

        if (!isPlayer) {
            const attackers = []
            if (Object.keys(nation.border).length > 0) {
                enemyJets.forEach(jet => {
                        const isInside = turf.booleanPointInPolygon(jet.location, nation.border)
                        if (isInside) {
                            attackers.push(jet.location)
                        }
                    
                })
            }

            if (attackers.length === 1) {
                target = attackers[0]
            } else if (attackers.length > 1) {
                const closestAttacker = attackers.reduce((prev, curr) => {
                    const prevDist = Math.hypot(prev[0] - jet.location[0], prev[1] - jet.location[1]);
                    const currDist = Math.hypot(curr[0] - jet.location[0], curr[1] - jet.location[1]);
                    return (currDist < prevDist) ? curr : prev;
                });
                target = closestAttacker
            }
        }

		if (!isPlayer || jet.guardMode || jet.patrol.patrolling || jet.waypoints.moving) {
			if (target) {
				if (!movingJets.includes(jet)) {
					jet.startLocation = jet.location;
					jet.target = target;
					jet.pointDistance = Math.sqrt(
						Math.pow(jet.target[0] - jet.location[0], 2) +
							Math.pow(jet.target[1] - jet.location[1], 2)
					);
					jet.targetDistance = 0;
					movingJets.push(jet);
				} else {
					let movingJet = movingJets[movingJets.indexOf(jet)];
					movingJet.startLocation = movingJet.location;
					movingJet.target = target;
					movingJet.pointDistance = Math.sqrt(
						Math.pow(movingJet.target[0] - movingJet.location[0], 2) +
							Math.pow(movingJet.target[1] - movingJet.location[1], 2)
					);
					movingJet.targetDistance = 0;
				}
			} else if (!movingJets[movingJets.indexOf(jet)]) {
				// console.log(randomPointOnBorder());
				// const randomTarget = randomPointOnBorder();
				// searchForTargets(jet, randomTarget);
			}
		}
	}

	function tickCity(city) {
		city.ticks++;

		if (city.ticks % city.ticksPerCredit === 0) {
			nation.credits += city.population;
			nations = nations;
		}
		if (city.ticks % city.ticksPerGrowth === 0) {
			city.population += 1;
			nations = nations;
		}
	}

	// tick.nations.forEach(nation => nation.tick())

	/*
        export let nations;
        export let thisNation;
        
        tick(currentTick) {
            cities.forEach(city => city.tick())
            jets.forEach(jet => jet.tick())

            if (currentTick % 20 === 0) {
                let otherNations = nations.filter(nation => nation.properties.team !== thisNation.properties.team)
                enemyJets = otherNations.map(nation => nation.jets))
            }
        }

        city.tick() {
            grow pop
            give gold
        }
    
        jet.tick() {
            let quadtree = d3.quadtree(enemyJets, [x, y])
            searchForTargets(jet, quadtree)
        }
    */

	// NationJets
	// NationTikiHuts
	// NationCities

	// <svelte:component this={Brazil} />
</script>

{#each nation.cities as city}
    {#if transform.k > 8}
        <text
            x={mapTiler(projection(city.center))[0] - city.nameLength / transform.k}
            y={mapTiler(projection(city.center))[1] - 12 / transform.k}
            font-size={10 / transform.k}
            stroke-width={1 / transform.k}
            class="city-name">{city.name}</text
        >
        <circle
            cx={mapTiler(projection(city.center))[0]}
            cy={mapTiler(projection(city.center))[1]}
            r={1.5 / transform.k}
            fill="white"
            stroke="black"
            stroke-width={0.75 / transform.k}
        />
    {/if}
	<circle
		cx={mapTiler(projection(city.center))[0] + (transform.k > 8 ? (- (12 + city.nameLength) / transform.k) : 0)}
		cy={mapTiler(projection(city.center))[1] + (transform.k > 8 ? (- 16 / transform.k) : 0)}
		r={8 / transform.k}
		fill={nation.color}
		stroke="none"
	/>
    <!-- "#3087EC" -->
	<text
		x={mapTiler(projection(city.center))[0] + (transform.k > 8 ? (- (12 + city.nameLength) / transform.k) : 0)}
		y={mapTiler(projection(city.center))[1] + (transform.k > 8 ? (- 12 / transform.k) : (3 / transform.k))}
		font-size={10 / transform.k}
		stroke-width={1 / transform.k}
		class="city-pop">{Math.round(city.population)}</text
	>
{/each}
{#key jetSelected}
	{#each nation.jets as jet}
		{#if jetSelected}
			<path
				d={jet.waypoints.path}
				fill="none"
				stroke="#1BA1FF"
				opacity={jet === jetSelected ? 1 : 0.5}
				stroke-width={2 / transform.k}
			/>
			{#each jet.waypoints.points as point}
				<svg
					x={mapTiler(projection(point))[0] - 8 / transform.k}
					y={mapTiler(projection(point))[1] - 8 / transform.k}
					width={16 / transform.k}
					height={16 / transform.k}
					viewBox="0 0 20 20"
					fill="none"
					opacity={jet === jetSelected ? 1 : 0.5}
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
			{/each}

			<path
				d={jet.patrol.path}
				fill="none"
				stroke="#FF7425"
				opacity={jet === jetSelected ? 1 : 0.5}
				stroke-width={2 / transform.k}
			/>
			<path
				d={jet.patrol.endToStartPath}
				fill="none"
				stroke="#FF7425"
				opacity="0.2"
				stroke-width={2 / transform.k}
			/>

			{#each jet.patrol.points as point}
				<svg
					x={mapTiler(projection(point))[0] - 8 / transform.k}
					y={mapTiler(projection(point))[1] - 8 / transform.k}
					width={16 / transform.k}
					height={16 / transform.k}
					viewBox="0 0 20 20"
					fill="none"
					opacity={jet === jetSelected ? 1 : 0.5}
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="2.1213"
						width="10.6554"
						height="10.6554"
						transform="matrix(0.707105 -0.707109 0.707105 0.707109 0.912335 11.594)"
						fill="#FF7425"
						stroke="white"
						stroke-width="2.99998"
					/>
				</svg>
			{/each}
		{/if}
	{/each}
{/key}
{#each nation.jets as jet}
	<svg
		x={mapTiler(projection(jet.location))[0] - 18 / transform.k / 2}
		y={mapTiler(projection(jet.location))[1] - 18 / transform.k / 2}
		width={18 / transform.k}
		height={18 / transform.k}
		viewBox="0 0 30 30"
		fill="none"
		class="airplane"
		xmlns="http://www.w3.org/2000/svg"
	>
    <!-- fill={isPlayer ? (jetSelected === jet ? 'blue' : 'black') : 'black'} -->

		<path
            transform="rotate({jet.rotation} 15 15)"
			d="M21.5897 19.0897L17.9979 15.4979C17.5105 15.0105 17.6508 14.1876 18.2723 13.8893L28.3662 9.0442C28.9462 8.76584 29.1162 8.02028 28.7144 7.51798L27.8775 6.47193C27.6454 6.18175 27.2715 6.04423 26.9067 6.11484L12.5014 8.90296C12.1865 8.96391 11.8614 8.87009 11.6274 8.65071L4.14575 1.63664C4.04953 1.54644 3.93642 1.47616 3.81293 1.42985L3.45511 1.29566C1.96837 0.738138 0.456035 2.05216 0.800485 3.60218L0.940607 4.23273C0.979487 4.40769 1.06467 4.56899 1.18726 4.69974L8.14803 12.1246C8.36891 12.3602 8.46241 12.6879 8.39908 13.0046L5.60496 26.9752C5.53939 27.3031 5.64201 27.642 5.87843 27.8784L7.01894 29.0189C7.50158 29.5016 8.31523 29.3695 8.62048 28.759L13.4127 19.1746C13.7081 18.5837 14.4851 18.4366 14.9761 18.8785L18.5421 22.0879C18.8229 22.3406 18.9373 22.7299 18.8379 23.0943L17.6527 27.4401C17.5583 27.7863 17.6566 28.1566 17.9103 28.4103L18.6048 29.1048C19.0615 29.5615 19.825 29.4719 20.1635 28.9218L23.3506 23.7428C23.4482 23.5841 23.5883 23.4558 23.755 23.3725L28.3936 21.0532C28.963 20.7685 29.125 20.0312 28.7273 19.5341L27.9103 18.5129C27.6612 18.2015 27.251 18.0679 26.8663 18.1728L22.5599 19.3473C22.2137 19.4417 21.8434 19.3434 21.5897 19.0897Z"
			fill={isPlayer ? (jetSelected === jet ? nation.color : nation.color) : nation.color}
			stroke="white"
		/>
	</svg>
    {#if transform.k > 8}
        <svg
            x={mapTiler(projection(jet.location))[0] + 40 / transform.k / 2}
            y={mapTiler(projection(jet.location))[1] - 30 / transform.k / 2}
            width={30 / transform.k}
            height={30 / transform.k}
            stroke="none"
        >
            <svelte:component this={nation.flag} />
        </svg>
    {/if}
    {#if transform.k > 8 || jet.health < 100}
        <rect
            x={mapTiler(projection(jet.location))[0] + (-50) / transform.k / 2}
            y={mapTiler(projection(jet.location))[1] - 44 / transform.k / 2}
            width={100 / 2 / transform.k}
            height={6 / transform.k}
            fill="#064977"
            stroke="none"
        />
        <rect
            x={mapTiler(projection(jet.location))[0] + (-50) / transform.k / 2}
            y={mapTiler(projection(jet.location))[1] - 44 / transform.k / 2}
            width={Math.max(jet.health, 0) / 2 / transform.k}
            height={6 / transform.k}
            fill="#1BA1FF"
            stroke="none"
        />
    {/if}
	{#if jet.guardMode && jetSelected}
		<circle
			cx={mapTiler(projection(jet.location))[0]}
			cy={mapTiler(projection(jet.location))[1]}
			r={10}
			fill="none"
			stroke="blue"
			opacity="0.5"
			stroke-width={1 / transform.k}
		/>
	{/if}
    {#if isPlayer}
        <circle
            on:click|stopPropagation={() => {
                activeHudItem = '';
                jetSelected = jet;
            }}
            cx={mapTiler(projection(jet.location))[0]}
            cy={mapTiler(projection(jet.location))[1]}
            r={20 / transform.k}
            fill="transparent"
            stroke="none"
            opacity="0.5"
            class={isPlayer ? 'jet-helper' : ''}
        />
    {/if}
	<!-- <circle
		on:click|stopPropagation={() => {
			if (isPlayer) {
				activeHudItem = '';
				jetSelected = jet;
			}
		}}
		cx={mapTiler(projection(jet.location))[0]}
		cy={mapTiler(projection(jet.location))[1]}
		r={isPlayer ? 20 / transform.k : 10}
		fill={isPlayer ? 'transparent' : 'none'}
		stroke={isPlayer ? (jet.guardMode ? 'none' : 'none') : 'red'}
		opacity="0.5"
		stroke-width={1 / transform.k}
		class={isPlayer ? 'jet-helper' : ''}
	/> -->
{/each}


<style>
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

	.jet-helper:hover {
		fill: rgba(255, 255, 255, 0.2);
	}
</style>
