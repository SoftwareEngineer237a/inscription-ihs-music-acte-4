export type Presence = "OUI" | "NON";

export type Registration = {
  code: string;
  nom: string;
  telephone: string;
  email: string;
  attentes: string;
  present: Presence;
  dateInscription: string;
  heureEntree: string | null;
};

export type RegisterPayload = {
  nom: string;
  telephone: string;
  email: string;
  attentes: string;
};

export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: string };

export type RegisterResponse =
  | ApiOk<{ code: string; nom: string }>
  | ApiErr;

export type LookupResponse =
  | ApiOk<{
      found: true;
      code: string;
      nom: string;
      telephone: string;
      email: string;
      present: Presence;
      dateInscription: string;
      heureEntree: string | null;
    }>
  | ApiOk<{ found: false }>
  | ApiErr;

export type ListResponse = ApiOk<{ rows: Registration[] }> | ApiErr;

export type CheckinResponse =
  | ApiOk<{
      code: string;
      nom: string;
      present: Presence;
      heureEntree: string | null;
      already: boolean;
    }>
  | ApiErr;
