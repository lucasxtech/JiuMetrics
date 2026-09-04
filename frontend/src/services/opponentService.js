// Fachada nomeada sobre `personService('opponent')` (spec 013).
import { personService } from './personService';

const svc = personService('opponent');

export const getAllOpponents = svc.getAll;
export const getOpponentById = svc.getById;
export const createOpponent = svc.create;
export const updateOpponent = svc.update;
export const deleteOpponent = svc.remove;
