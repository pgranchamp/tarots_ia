// Fichier: /api/interpret.js
export default async function handler(req, res) {
  try {
    // Vérifier que la requête est une méthode POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Extraire les données du tirage
    const { past, present, future } = req.body;

    // Vérifier que toutes les cartes sont présentes
    if (!past || !present || !future) {
      return res.status(400).json({ error: 'Données de tirage incomplètes' });
    }
    
    try {
      // Utiliser un modèle Mistral plus petit et plus rapide
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-small", // Plus rapide que mistral-large-latest
          messages: [
            {
              role: "user",
              content: `Interprète ce tirage de tarot à trois cartes de façon concise.
              
              Passé: ${past.name} (mots-clés: ${past.keywords})
              Présent: ${present.name} (mots-clés: ${present.keywords})
              Futur: ${future.name} (mots-clés: ${future.keywords})
              
              Format HTML:
              <h3>Le Passé</h3>
              <p>Interprétation concise</p>
              <h3>Le Présent</h3>
              <p>Interprétation concise</p>
              <h3>Le Futur</h3>
              <p>Interprétation concise</p>
              <h3>Synthèse</h3>
              <p>Brève synthèse</p>`
            }
          ],
          temperature: 0.7,
          max_tokens: 500 // Limiter la taille de la réponse
        })
      });

      // Vérifier si la réponse de l'API est valide
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API Mistral:", response.status, errorText);
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Vérifier la structure de la réponse
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return res.status(200).json({ 
          interpretation: data.choices[0].message.content,
          source: "mistral"
        });
      } else {
        throw new Error("Format de réponse inattendu de l'API Mistral");
      }
      
    } catch (apiError) {
      console.error("Erreur lors de l'appel à Mistral:", apiError);
      
      // Génération de repli si l'API échoue
      const interpretation = `
        <h3>Introduction</h3>
        <p>Votre tirage du tarot révèle une histoire fascinante qui se déroule entre votre passé, votre présent et ce qui en résultera dans le futur.</p>
        
        <h3>Le Passé : ${past.name}</h3>
        <p>Cette carte représente les fondations de votre situation actuelle. 
        ${past.name} dans la position du passé suggère que vous avez traversé une période 
        caractérisée par des éléments liés à ${past.keywords}.</p>
        
        <h3>Le Présent : ${present.name}</h3>
        <p>Dans votre situation actuelle, l'énergie de ${present.name} est prédominante, 
        associée à ${present.keywords}.</p>
        
        <h3>Le Futur : ${future.name}</h3>
        <p>${future.name} apparaît comme la résultante probable de votre trajectoire actuelle, 
        liée à ${future.keywords}.</p>
        
        <h3>Synthèse</h3>
        <p>La progression de ${past.name} à ${present.name}, puis vers ${future.name} raconte 
        une histoire cohérente de transformation.</p>
      `;
      
      return res.status(200).json({ 
        interpretation: interpretation,
        source: "local"
      });
    }
    
  } catch (error) {
    console.error('Erreur générale:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'interprétation du tirage', 
      details: error.message 
    });
  }
}
