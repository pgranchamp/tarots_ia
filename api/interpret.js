// Fichier: /api/interpret.js
export default async function handler(req, res) {
  try {
    // Vérifier que la requête est une méthode POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Extraire les données du tirage
    console.log("Requête reçue:", req.body);
    const { past, present, future } = req.body;

    // Vérifier que toutes les cartes sont présentes
    if (!past || !present || !future) {
      return res.status(400).json({ error: 'Données de tirage incomplètes' });
    }
    
    try {
      // Appel à l'API Mistral
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-large-latest", // Utiliser le modèle approprié
          messages: [
            {
              role: "user",
              content: `Tu es un expert en lecture de tarot. Interprète ce tirage de tarot à trois cartes avec détail.
              
              Passé: ${past.name} (mots-clés: ${past.keywords})
              Présent: ${present.name} (mots-clés: ${present.keywords})
              Futur: ${future.name} (mots-clés: ${future.keywords})
              
              Format de sortie:
              - Une introduction brève sur le tirage
              - Une section détaillée pour chaque carte (Passé, Présent, Futur)
              - Une synthèse des interconnexions entre les trois cartes
              - Un conseil pratique basé sur cette lecture
              
              Utilise le format HTML avec des balises <h3> pour les titres de section.`
            }
          ],
          temperature: 0.7 // Ajuster pour plus ou moins de créativité
        })
      });

      // Vérifier si la réponse de l'API est valide
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API Mistral:", response.status, errorText);
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Réponse API:", JSON.stringify(data).substring(0, 200) + "...");
      
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
        caractérisée par des éléments liés à ${past.keywords}. Ces expériences ont façonné 
        votre approche actuelle et continuent d'influencer vos décisions.</p>
        
        <h3>Le Présent : ${present.name}</h3>
        <p>Dans votre situation actuelle, l'énergie de ${present.name} est prédominante. 
        Cette carte, associée à ${present.keywords}, indique que vous êtes dans une phase 
        où ces qualités sont particulièrement importantes à reconnaître et à intégrer dans 
        votre approche.</p>
        
        <h3>Le Futur : ${future.name}</h3>
        <p>${future.name} apparaît comme la résultante probable de votre trajectoire actuelle. 
        Cette carte, liée à ${future.keywords}, suggère que les défis et opportunités à venir 
        seront teintés par ces aspects.</p>
        
        <h3>Synthèse</h3>
        <p>La progression de ${past.name} à ${present.name}, puis vers ${future.name} raconte 
        une histoire cohérente de transformation. La présence de ces trois arcanes majeurs 
        indique que vous traversez un cycle important de votre vie, avec des leçons significatives 
        à intégrer.</p>
        
        <h3>Conseil</h3>
        <p>Pour maximiser le potentiel positif de ce tirage, soyez attentif aux moments où les thèmes 
        de ${present.keywords} se manifestent dans votre vie quotidienne, car ils représentent des 
        opportunités de transformation vers l'énergie de ${future.name}.</p>
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
