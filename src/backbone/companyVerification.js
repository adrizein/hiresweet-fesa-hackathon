// Fail-closed cross-company verification, shared by any signal strategy that
// deals with a LinkedIn interaction between two people (likes, comments,
// mentions). Lesson from this project's own testing: a LinkedIn headline is
// not evidence. One candidate's headline named no employer at all and turned
// out — once checked against real employment data — to be a colleague of the
// person she appeared to be engaging with from outside. So this never reads
// headline text; it always resolves the real employer through FullEnrich,
// and blocks (does not guess) when that resolution fails.
export async function verifyCrossCompanyInteraction(interaction, { clients, log = () => {} }) {
  const { author: interactionAuthor } = interaction.interaction ?? interaction;
  const postAuthor = interaction.post?.author;
  if (!interactionAuthor?.linkedinUrl || !postAuthor?.linkedinUrl) {
    return { verified: false, reason: 'missing linkedin identifiers for one or both parties' };
  }

  const [domainA, domainB] = await Promise.all([
    clients.fullenrich.resolvePersonCompanyDomain(interactionAuthor.linkedinUrl),
    clients.fullenrich.resolvePersonCompanyDomain(postAuthor.linkedinUrl),
  ]);

  if (!domainA || !domainB) {
    log(
      `companyVerification: could not resolve employer for ${!domainA ? interactionAuthor.name : postAuthor.name} — blocking (fail-closed)`,
    );
    return { verified: false, reason: 'employer unresolved for at least one party' };
  }
  if (domainA.toLowerCase() === domainB.toLowerCase()) {
    return { verified: false, reason: `same-company interaction (${domainA}) — not a cross-company signal` };
  }
  return { verified: true, interactionDomain: domainA, postDomain: domainB };
}
