/** "Layla Haddad" (last name optional). */
export function fullName(contact: { firstName: string; lastName: string | null }): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}
