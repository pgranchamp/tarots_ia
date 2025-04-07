// Fichier: /api/interpret.js
export default async function handler(req, res) {
  try {
    // Récupérer les données du tirage
    const { past, present, future } = req.body;
    
    // Appel sécurisé à Mistral en utilisant la clé d'API stockée comme variable d'environnement
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: `Interprète ce tirage de tarot à 3 cartes:
            Passé: ${past.name}
            Présent: ${present.name}
            Futur: ${future.name}
            Fais une analyse détaillée de chaque carte et une synthèse globale.`
          }
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    res.status(200).json({ interpretation: data.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'interprétation du tirage' });
  }
}
