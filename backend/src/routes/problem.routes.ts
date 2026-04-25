import { Router } from "express";
import {
  list,
  create,
  update,
  remove,
  addTC,
  removeTC,
} from "../controllers/problem.controller";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true }); // gets :code from parent

router.get("/", optionalAuth, list);
router.post("/", authenticate, create);
router.put("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);
router.post("/:id/testcases", authenticate, addTC);
router.delete("/:id/testcases/:tcId", authenticate, removeTC);

export default router;
