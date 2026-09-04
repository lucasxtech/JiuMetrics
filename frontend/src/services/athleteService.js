// Fachada nomeada sobre `personService('athlete')` (spec 012).
import { personService } from './personService';

const svc = personService('athlete');

export const getAllAthletes = svc.getAll;
export const getAthleteById = svc.getById;
export const createAthlete = svc.create;
export const updateAthlete = svc.update;
export const deleteAthlete = svc.remove;
