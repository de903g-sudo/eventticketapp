import express from 'express';
import { loginHandler, logoutHandler } from '../controllers/auth.controller';
import { signupHandler } from '../controllers/auth/signup.controller';

const router = express.Router();

router.post('/signup', signupHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);

export default router;