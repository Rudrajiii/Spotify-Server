const express = require("express");
const router = express.Router();
const { handleGetLifeUpdates, invalidateLifeUpdatesCache, handleHealthCheck } = require("../controller/PublicController/public.lifeUpdates.controller");

router.get("/life-updates", handleGetLifeUpdates);

router.invalidateLifeUpdatesCache = invalidateLifeUpdatesCache;

router.get("/health", handleHealthCheck);

module.exports = router;
