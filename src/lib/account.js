export async function requestEmailChange(auth, email, currentEmail) {
  const nextEmail = email.trim()
  if (!nextEmail) throw new Error('Ingresá un correo nuevo.')
  if (nextEmail.toLowerCase() === currentEmail?.trim().toLowerCase()) {
    throw new Error('El correo nuevo debe ser diferente del actual.')
  }
  const { error } = await auth.updateUser({ email: nextEmail })
  if (error) throw error
}
