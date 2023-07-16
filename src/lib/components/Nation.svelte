<script>
	import * as d3 from 'd3';
	import * as turf from '@turf/turf';
	import { onDestroy } from 'svelte';

	export let isPlayer;
	export let itemSelected;
	export let nation;
	export let nations;
	export let mapTiler;
	export let projection;
	export let transform;
	export let movingEntities;
	export let cityNamesDataset;
	export let countryNamesDataset;
	export let jetPatrolUI;
	export let activeHudItem;
	export let path;
	export let destroyNation;

	export let jetController;
	export let settlerController;

	let enemyJets;
	let enemyJetsQuadtree;
	let enemyCities;
	let enemyCitiesQuadtree;

	export function tick(currentTick) {
		// if (currentTick % 100 === 0) {
		//     let overlaps = [];
		//     nation.countries.forEach(country => {
		//         const adjacent = countryNamesDataset.filter(feature =>
		//             nation.countries.every(c => feature.properties.NAME !== c.properties.NAME) &&
		//             turf.booleanOverlap(country, feature)
		//         )
		//         overlaps = [...overlaps, ...adjacent]
		//     })

		//     overlaps.forEach(overlap => {
		//         overlap.location = [overlap.properties.LABEL_X, overlap.properties.LABEL_Y]
		//     })

		//     adjacentCountries = overlaps
		// }

		if (currentTick % 20 === 0) {
			if (!nation.capitalFounded) {
				buildCity();
			}

			let otherNations = nations.filter((otherNation) => otherNation.team !== nation.team);
			enemyJets = otherNations.map((otherNation) => otherNation.jets);
			enemyJets = enemyJets.flat();
			enemyCities = otherNations.map((otherNation) => otherNation.cities);
			enemyCities = enemyCities.flat();
			enemyJetsQuadtree = d3
				.quadtree()
				.x((jet) => jet.location[0])
				.y((jet) => jet.location[1])
				.addAll(enemyJets);
			enemyCitiesQuadtree = d3
				.quadtree()
				.x((city) => city.location[0])
				.y((city) => city.location[1])
				.addAll(enemyCities);

			if (!isPlayer) {
				buildStuff();
			}

            if (!isPlayer) {
                nation.settlers.forEach((settler) => tickSettler(settler));
            }
		}

		if (currentTick % 1 === 0) {
			nation.jets.forEach((jet) => searchForTargets(jet));
			nation.settlers.forEach((settler) => moveSettler(settler));
		}

		nation.jets.forEach((jet) => tickJet(jet));
		nation.cities.forEach((city) => tickCity(city));

		tickNation();
	}

	function buildStuff() {
		const nextPurchase =
			nation.strategy.purchaseOrder[
				nation.strategy.purchaseIndex % nation.strategy.purchaseOrder.length
			];
		if (nextPurchase === 'city') {
			// buildCity();
		} else if (nextPurchase === 'jet') {
			buildJet();
		} else if (nextPurchase === 'settler') {
			buildSettler();
		}
	}

	export function buildCity(center) {
		nation.capitalFounded = true;
		// if (Object.keys(nation.border).length > 0) {
		//     const isInside = turf.booleanPointInPolygon(center, nation.border)
		//     if (!isInside) {
		//         return
		//     }
		//

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
				type: 'city',
				location: center,
				health: 800,
				name: newCity.properties.name,
				nameLength: newCity.properties.name.length,
				population: 1,
				ticks: 0,
				ticksPerCredit: 100,
				ticksPerGrowth: 1200,
				growthRate: Math.floor(Math.random() * 10) / 10 + 1, // 1.0-2.0
				visible: true
			}
		];

		nation.strategy.purchaseIndex++;
	}

	export function buildSettler(location) {
		if (nation.credits >= nation.items.settler.cost) {
			if (!location) location = randomPointNearCity();

			if (Object.keys(nation.border).length > 0) {
				const isInside = turf.booleanPointInPolygon(location, nation.border);
				if (!isInside) {
					return;
				}
			}

			nation.credits -= nation.items.settler.cost;
			nation.items.settler.cost += nation.items.settler.costIncrease;

			nation.settlers = [
				...nation.settlers,
				{
					type: 'settler',
					location: location,
					health: 100,
					waypoints: {
						moving: false,
						points: [],
						path: '',
                        processing: null
					},
					startLocation: [],
					target: [],
					targetDistance: 0,
					pointDistance: 0
				}
			];

			nation.strategy.purchaseIndex++;
		}
	}

	export function buildJet(location) {
		if (nation.credits >= nation.items.jet.cost) {
			if (!location) location = randomPointNearCity();

			if (Object.keys(nation.border).length > 0) {
				const isInside = turf.booleanPointInPolygon(location, nation.border);
				if (!isInside) {
					return;
				}
			}

			nation.credits -= nation.items.jet.cost;
			nation.items.jet.cost += nation.items.jet.costIncrease;

			nation.jets = [
				...nation.jets,
				{
					type: 'jet',
					location: location,
					rotation: 45,
					health: 100,
					canAttackCities: false,
					guard: {
						guarding: false,
						circling: false,
						radius: 3,
						angle: 0,
						center: [],
						path: ''
					},
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

			nation.strategy.purchaseIndex++;
		}
	}

	function randomPointNearCity() {
		{
			const city = nation.cities[Math.floor(Math.random() * nation.cities.length)];
			// const radius = 1000;
			// const randomDistance = Math.max(Math.random() * radius, 100)
			const randomDistance = 300;
			const randomBearing = Math.random() * 360;
			const destination = turf.destination(city.location, randomDistance, randomBearing, {
				units: 'kilometers'
			});
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
		}
	}

	function randomPointInRegion(geometry = nation.geometry) {
		const bbox = turf.bbox(geometry);
		const randomPosition = turf.randomPosition(bbox);

		if (turf.booleanPointInPolygon(randomPosition, geometry)) {
			return randomPosition;
		} else {
			return randomPointInRegion(geometry);
		}
	}

	let nextIndex = 0;

	function randomPointOnBorder() {
		const coordinates = nation.geometry.coordinates.flat(2);
		return coordinates[Math.floor(Math.random() * coordinates.length)];
	}

	function tickSettler(settler) {
		if (!settler.processing && !settler.waypoints.moving && nation.countries.length) {
			console.log('Calculating Adj');
            settler.processing = setTimeout(() => {
                let adjacentCountries = [];
                nation.countries.forEach((country) => {
                    const adjacent = countryNamesDataset.filter(
                        (feature) =>
                            nation.countries.every((c) => feature.properties.NAME !== c.properties.NAME) &&
                            turf.booleanOverlap(country, feature)
                    );
                    adjacentCountries = [...adjacentCountries, ...adjacent];
                });

                adjacentCountries.forEach((country) => {
                    // country.location = [country.properties.LABEL_X, country.properties.LABEL_Y];
                    country.location = randomPointInRegion(country.geometry);
                });

                if (adjacentCountries.length) {
                    const closestAdjacentCountry = adjacentCountries.reduce((prev, curr) => {
                        const prevDist = Math.hypot(
                            prev.location[0] - settler.location[0],
                            prev.location[1] - settler.location[1]
                        );
                        const currDist = Math.hypot(
                            curr.location[0] - settler.location[0],
                            curr.location[1] - settler.location[1]
                        );
                        return currDist < prevDist ? curr : prev;
                    });

                    settlerController.setTarget(settler, closestAdjacentCountry.location);
                } else {
                    console.log('Calculating Unclaimed');
                    const unclaimedCountries = countryNamesDataset.filter(country => nations.every(nation => nation.countries.every(c => c.properties.NAME !== country.properties.NAME)))
                    const closestUnclaimedCountry = unclaimedCountries.reduce((prev, curr) => {
                        const prevDist = Math.hypot(
                            prev.properties.LABEL_X - settler.location[0],
                            prev.properties.LABEL_Y - settler.location[1]
                        );
                        const currDist = Math.hypot(
                            curr.properties.LABEL_X - settler.location[0],
                            curr.properties.LABEL_Y - settler.location[1]
                        );
                        return currDist < prevDist ? curr : prev;
                    });

                    settlerController.setTarget(settler, randomPointInRegion(closestUnclaimedCountry.geometry));
                }
            }, 0)
		}

		if (settler.waypoints.moving && settler.waypoints.points.length === 0) {
			buildCity(settler.location);
			nation.settlers.splice(nation.settlers.indexOf(settler), 1);
		}
	}

	function tickJet(jet) {
		if (jet.health <= 0) {
			nation.jets.splice(nation.jets.indexOf(jet), 1);
			return;
		}

		if (!isPlayer) {
			// if (nation.jets.length === nation.strategy.jetsPerAttack) {
			if (jet.waypoints.points.length === 0 && enemyCities.length) {
				const closestEnemyCity = enemyCities.reduce((prev, curr) => {
					const prevDist = Math.hypot(
						prev.location[0] - jet.location[0],
						prev.location[1] - jet.location[1]
					);
					const currDist = Math.hypot(
						curr.location[0] - jet.location[0],
						curr.location[1] - jet.location[1]
					);
					return currDist < prevDist ? curr : prev;
				});

				jet.canAttackCities = true;
				jetController.addWaypoint(jet, closestEnemyCity.location);
			}
			// }
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
	function moveSettler(settler, target) {
		if (settler.waypoints.moving) {
			target = settler.waypoints.points[0];
		}

		if (target) {
			if (!movingEntities.includes(settler)) {
				settler.startLocation = settler.location;
				settler.target = target;
				settler.pointDistance = Math.sqrt(
					Math.pow(settler.target[0] - settler.location[0], 2) +
						Math.pow(settler.target[1] - settler.location[1], 2)
				);
				settler.targetDistance = 0;
				movingEntities.push(settler);
			} else {
				let movingSettler = movingEntities[movingEntities.indexOf(settler)];
				movingSettler.startLocation = movingSettler.location;
				movingSettler.target = target;
				movingSettler.pointDistance = Math.sqrt(
					Math.pow(movingSettler.target[0] - movingSettler.location[0], 2) +
						Math.pow(movingSettler.target[1] - movingSettler.location[1], 2)
				);
				movingSettler.targetDistance = 0;
			}
		}
	}

	function searchForTargets(jet, target) {
		let neighbor;

		if (jet.canAttackCities && enemyCitiesQuadtree) {
			neighbor = enemyCitiesQuadtree.find(jet.location[0], jet.location[1], 3.8);
		}

		if (enemyJetsQuadtree) {
			let enemyJet = enemyJetsQuadtree.find(jet.location[0], jet.location[1], 3.8);
			if (enemyJet) {
				neighbor = enemyJet;
			}
		}

		if (neighbor) {
			// if ((jet.guard.guarding || !isPlayer) || (jet.canAttack)) {
			jet.guard.circling = false;
			target = neighbor.location;
			neighbor.health -= Math.random() * 5;
			// }
		} else if (jet.patrol.patrolling) {
			target = jet.patrol.points[jet.patrol.nextPoint % jet.patrol.points.length];
		} else if (jet.waypoints.moving) {
			target = jet.waypoints.points[0];
		} else if (jet.guard.guarding) {
			jet.guard.circling = true;
			target = [0, 0];
		}

		if (!isPlayer) {
			const attackers = [];
			if (Object.keys(nation.border).length > 0) {
				enemyJets.forEach((jet) => {
					const isInside = turf.booleanPointInPolygon(jet.location, nation.border);
					if (isInside) {
						attackers.push(jet.location);
					}
				});
			}

			if (attackers.length === 1) {
				target = attackers[0];
			} else if (attackers.length > 1) {
				const closestAttacker = attackers.reduce((prev, curr) => {
					const prevDist = Math.hypot(prev[0] - jet.location[0], prev[1] - jet.location[1]);
					const currDist = Math.hypot(curr[0] - jet.location[0], curr[1] - jet.location[1]);
					return currDist < prevDist ? curr : prev;
				});
				target = closestAttacker;
			}
		}

		if (!isPlayer || jet.guard.guarding || jet.patrol.patrolling || jet.waypoints.moving) {
			if (target) {
				if (!movingEntities.includes(jet)) {
					jet.startLocation = jet.location;
					jet.target = target;
					jet.pointDistance = Math.sqrt(
						Math.pow(jet.target[0] - jet.location[0], 2) +
							Math.pow(jet.target[1] - jet.location[1], 2)
					);
					jet.targetDistance = 0;
					movingEntities.push(jet);
				} else {
					let movingJet = movingEntities[movingEntities.indexOf(jet)];
					movingJet.startLocation = movingJet.location;
					movingJet.target = target;
					movingJet.pointDistance = Math.sqrt(
						Math.pow(movingJet.target[0] - movingJet.location[0], 2) +
							Math.pow(movingJet.target[1] - movingJet.location[1], 2)
					);
					movingJet.targetDistance = 0;
				}
			} else if (!movingEntities[movingEntities.indexOf(jet)]) {
				// console.log(randomPointOnBorder());
				// const randomTarget = randomPointOnBorder();
				// searchForTargets(jet, randomTarget);
			}
		}
	}

	function tickCity(city) {
		city.ticks++;

		if (city.health <= 0) {
			nation.cities.splice(nation.cities.indexOf(city), 1);
		}

		if (city.ticks % city.ticksPerCredit === 0) {
			nation.credits += city.population;
			nations = nations;
		}
		if (city.ticks % city.ticksPerGrowth === 0) {
			city.population += 1;
			nations = nations;
		}
	}

	function tickNation() {
		if (nation.cities.length === 0 && nation.capitalFounded) {
			destroyNation(nation);
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
			x={mapTiler(projection(city.location))[0] - city.nameLength / transform.k}
			y={mapTiler(projection(city.location))[1] - 18 / transform.k}
			font-size={10 / transform.k}
			stroke-width={1 / transform.k}
			class="city-name">{city.name}</text
		>
		<circle
			cx={mapTiler(projection(city.location))[0]}
			cy={mapTiler(projection(city.location))[1]}
			r={1.5 / transform.k}
			fill="white"
			stroke="black"
			stroke-width={0.75 / transform.k}
		/>
	{/if}
	{#if transform.k > 8 || city.health < 100}
		<rect
			x={mapTiler(projection(city.location))[0] - city.nameLength / transform.k}
			y={mapTiler(projection(city.location))[1] - 14 / transform.k}
			width={200 / 2 / transform.k}
			height={6 / transform.k}
			fill="#064977"
			stroke="none"
		/>
		<rect
			x={mapTiler(projection(city.location))[0] - city.nameLength / transform.k}
			y={mapTiler(projection(city.location))[1] - 14 / transform.k}
			width={Math.max(city.health / 4, 0) / 2 / transform.k}
			height={6 / transform.k}
			fill="#1BA1FF"
			stroke="none"
		/>
	{/if}
	<circle
		cx={mapTiler(projection(city.location))[0] +
			(transform.k > 8 ? -(12 + city.nameLength) / transform.k : 0)}
		cy={mapTiler(projection(city.location))[1] + (transform.k > 8 ? -16 / transform.k : 0)}
		r={8 / transform.k}
		fill={nation.color}
		stroke="none"
	/>
	<!-- "#3087EC" -->
	<text
		x={mapTiler(projection(city.location))[0] +
			(transform.k > 8 ? -(12 + city.nameLength) / transform.k : 0)}
		y={mapTiler(projection(city.location))[1] +
			(transform.k > 8 ? -12 / transform.k : 3 / transform.k)}
		font-size={10 / transform.k}
		stroke-width={1 / transform.k}
		class="city-pop">{Math.round(city.population)}</text
	>
	{#if isPlayer}
		<circle
			on:click|stopPropagation={() => {
				activeHudItem = '';
				if (itemSelected && itemSelected.type === 'jet') {
					jetController.addWaypoint(itemSelected, city.location);
					itemSelected.canAttackCities = true;
				} else {
					itemSelected = city;
				}
			}}
			cx={mapTiler(projection(city.location))[0]}
			cy={mapTiler(projection(city.location))[1]}
			r={20 / transform.k}
			fill="transparent"
			stroke="none"
			opacity="0.5"
			class="selection-helper"
		/>
	{:else if itemSelected && itemSelected.type === 'jet'}
		<circle
			on:click|stopPropagation={() => {
				jetController.addWaypoint(itemSelected, city.location);
				itemSelected.canAttackCities = true;
			}}
			cx={mapTiler(projection(city.location))[0]}
			cy={mapTiler(projection(city.location))[1]}
			r={20 / transform.k}
			fill="transparent"
			stroke="none"
			opacity="0.5"
			class="selection-helper"
		/>
	{/if}
{/each}
{#key itemSelected}
	{#each nation.settlers as settler}
		<svg
			x={mapTiler(projection(settler.location))[0] - 8 / transform.k}
			y={mapTiler(projection(settler.location))[1] - 8 / transform.k}
			width={16 / transform.k}
			height={16 / transform.k}
			viewBox="0 0 25 26"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M5 16C5 16 6 15 9 15C12 15 14 17 17 17C20 17 21 16 21 16V4C21 4 20 5 17 5C14 5 12 3 9 3C6 3 5 4 5 4V16ZM5 16V23"
				stroke="white"
				stroke-width="5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M5 16C5 16 6 15 9 15C12 15 14 17 17 17C20 17 21 16 21 16V4C21 4 20 5 17 5C14 5 12 3 9 3C6 3 5 4 5 4V16Z"
				fill={nation.color}
			/>
			<path
				d="M5 16C5 16 6 15 9 15C12 15 14 17 17 17C20 17 21 16 21 16V4C21 4 20 5 17 5C14 5 12 3 9 3C6 3 5 4 5 4V16ZM5 16V23"
				stroke={nation.color}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		{#if itemSelected && itemSelected.type === 'settler'}
			<path
				d={settler.waypoints.path}
				fill="none"
				stroke="#1BA1FF"
				opacity={settler === itemSelected ? 1 : 0.5}
				stroke-width={2 / transform.k}
			/>
			{#each settler.waypoints.points as point}
				<svg
					x={mapTiler(projection(point))[0] - 8 / transform.k}
					y={mapTiler(projection(point))[1] - 8 / transform.k}
					width={16 / transform.k}
					height={16 / transform.k}
					viewBox="0 0 20 20"
					fill="none"
					opacity={settler === itemSelected ? 1 : 0.5}
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
		{/if}
		{#if isPlayer}
			<circle
				on:click|stopPropagation={() => {
					activeHudItem = '';
					itemSelected = settler;
				}}
				cx={mapTiler(projection(settler.location))[0]}
				cy={mapTiler(projection(settler.location))[1]}
				r={20 / transform.k}
				fill="transparent"
				stroke="none"
				opacity="0.5"
				class={isPlayer ? 'selection-helper' : ''}
			/>
		{/if}
	{/each}
{/key}
{#key itemSelected}
	{#each nation.jets as jet}
		{#if jet.guard.guarding}
			<circle
				cx={mapTiler(projection(jet.guard.center))[0]}
				cy={mapTiler(projection(jet.guard.center))[1]}
				r="7.5"
				fill="none"
				stroke="#1BA1FF"
				opacity="0.5"
				style="background: conic-gradient(red, orange, yellow, green, blue);"
				stroke-width={1 / transform.k}
			/>
		{/if}
		{#if isPlayer}
			<path
				d={jet.waypoints.path}
				fill="none"
				stroke="#1BA1FF"
				opacity={jet === itemSelected ? 1 : 0.5}
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
					opacity={jet === itemSelected ? 1 : 0.5}
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
				opacity={jet === itemSelected ? 1 : 0.5}
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
					opacity={jet === itemSelected ? 1 : 0.5}
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
			fill={isPlayer ? (itemSelected === jet ? nation.color : nation.color) : nation.color}
			stroke="white"
		/>
	</svg>
	{#if transform.k > 8 || jet.health < 100}
		<rect
			x={mapTiler(projection(jet.location))[0] + -50 / transform.k / 2}
			y={mapTiler(projection(jet.location))[1] - 44 / transform.k / 2}
			width={100 / 2 / transform.k}
			height={6 / transform.k}
			fill="#064977"
			stroke="none"
		/>
		<rect
			x={mapTiler(projection(jet.location))[0] + -50 / transform.k / 2}
			y={mapTiler(projection(jet.location))[1] - 44 / transform.k / 2}
			width={Math.max(jet.health, 0) / 2 / transform.k}
			height={6 / transform.k}
			fill="#1BA1FF"
			stroke="none"
		/>
	{/if}
	{#if isPlayer}
		<circle
			on:click|stopPropagation={() => {
				activeHudItem = '';
				itemSelected = jet;
			}}
			cx={mapTiler(projection(jet.location))[0]}
			cy={mapTiler(projection(jet.location))[1]}
			r={20 / transform.k}
			fill="transparent"
			stroke="none"
			opacity="0.5"
			class={isPlayer ? 'selection-helper' : ''}
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

	.selection-helper:hover {
		fill: rgba(255, 255, 255, 0.5);
	}
</style>
