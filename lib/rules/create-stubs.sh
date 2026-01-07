#!/bin/bash

# Create stub files for remaining rules

echo "export default async function R03_PackagedOTC(data, insuranceInfo) { return { found: false }; }" > R03-packaged-otc.js
echo "export default async function R05_UnlistedDrug(data, insuranceInfo) { return { found: false }; }" > R05-unlisted-drug.js
echo "export default async function R06_JCodeUnits(data, insuranceInfo) { return { found: false }; }" > R06-jcode-units.js
echo "export default async function R07_ModifierMisuse(data, insuranceInfo) { return { found: false }; }" > R07-modifier-misuse.js
echo "export default async function R08_UnbundlingPTP(data, insuranceInfo) { return { found: false }; }" > R08-unbundling-ptp.js
echo "export default async function R09_GlobalSurgical(data, insuranceInfo) { return { found: false }; }" > R09-global-surgical.js
echo "export default async function R10_TherapyTime(data, insuranceInfo) { return { found: false }; }" > R10-therapy-time.js
echo "export default async function R11_ObsInpatient(data, insuranceInfo) { return { found: false }; }" > R11-obs-inpatient.js
echo "export default async function R12_RoomBoardLOS(data, insuranceInfo) { return { found: false }; }" > R12-room-board-los.js
echo "export default async function R13_TimelyFiling(data, insuranceInfo) { return { found: false }; }" > R13-timely-filing.js
echo "export default async function R14_COBMissing(data, insuranceInfo) { return { found: false }; }" > R14-cob-missing.js
echo "export default async function R15_EOBZeroBilled(data, insuranceInfo) { return { found: false }; }" > R15-eob-zero-billed.js
echo "export default async function R17_TICOutlier(data, insuranceInfo) { return { found: false }; }" > R17-tic-outlier.js
echo "export default async function R18_MissingItemized(data, insuranceInfo) { return { found: false }; }" > R18-missing-itemized.js

echo "Stub files created!"