export type FormErrors = {
  nom?: string;
  telephone?: string;
  email?: string;
  attentes?: string;
};

export function validateRegistration(input: {
  nom: string;
  telephone: string;
  email: string;
  attentes: string;
}): FormErrors {
  const errors: FormErrors = {};
  const nom = input.nom.trim();
  const telephone = input.telephone.trim();
  const email = input.email.trim();
  const attentes = input.attentes.trim();

  if (nom.length < 2) {
    errors.nom = "Veuillez indiquer votre nom complet.";
  } else if (nom.length > 80) {
    errors.nom = "Le nom est trop long (80 caractères maximum).";
  }

  const digits = telephone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    errors.telephone = "Veuillez indiquer un numéro de téléphone valide.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Veuillez indiquer une adresse email valide.";
  }

  if (attentes.length < 3) {
    errors.attentes = "Dites-nous en quelques mots ce que vous attendez de ce programme.";
  } else if (attentes.length > 500) {
    errors.attentes = "Merci de raccourcir votre réponse (500 caractères maximum).";
  }

  return errors;
}
