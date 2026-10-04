// Moved to DB/wilayaCentroids.ts so both the API layer (registry route) and
// the DB/domain layer (ETA estimation, Task 4.3) can use it without the DB
// layer having to import from the API layer. Re-exported here unchanged so
// existing imports of '../data/wilayaCentroids' keep working.
export { WILAYA_CENTROIDS } from '../../DB/wilayaCentroids';
