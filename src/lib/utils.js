export function interpolate(a, b, frac) {
	const interpolateProjection = genInterp(a, b);
	const interpolatedCoords = interpolateProjection(frac);
	return interpolatedCoords;
}

function genInterp(start, target) {
	const edgeThreshold = 0.1; // Adjust this value as needed

	const startLat = start[0];
	const startLon = start[1];
	const targetLat = target[0];
	const targetLon = target[1];

	const diffLon = Math.abs(targetLon - startLon);
	const isNearEdge = diffLon > 180 - edgeThreshold;

	const interpolateLinear = (frac) => {
		const newLat = startLat + (targetLat - startLat) * frac;
		const newLon = startLon + (targetLon - startLon) * frac;

		return [newLat, newLon];
	};

	const interpolateAroundEdge = (frac) => {
		const newLat = startLat + (targetLat - startLat) * frac;
		const newLon = frac < 0.5 ? targetLon - 360 : targetLon + 360;

		return [newLat, newLon];
	};

	return isNearEdge ? interpolateAroundEdge : interpolateLinear;
}
