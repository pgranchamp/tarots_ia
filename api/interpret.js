// Fichier: /api/interpret.js
export default async function handler(req, res) {
  try {
    // Vérifier que la requête est une méthode POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Extraire les données du tirage
   // Extraire les données du tirage
const { past, present, future, question } = req.body;

// Vérifier que toutes les cartes sont présentes
if (!past || !present || !future) {
    return res.status(400).json({ error: 'Données de tirage incomplètes' });
}

// Utiliser une question par défaut si non fournie
const userQuestion = question || "Guidance générale";
    
    try {
      // Appel à l'API Mistral
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-small", // Utiliser un modèle plus rapide
         messages: [
    {
        role: "user",
        content: `Tu es un expert en lecture de tarot. Interprète ce tirage de tarot à trois cartes en réponse à la question: "${userQuestion}"
        en faisant le lien, dans ta courte synthèse, entre les prédictions du tarot et celles de l'IA
        Passé: ${past.name} (mots-clés: ${past.keywords})
        Présent: ${present.name} (mots-clés: ${present.keywords})
        Futur: ${future.name} (mots-clés: ${future.keywords})
        
        Format de sortie exact à respecter sans modification:
        <h3>Question</h3>
        <p>${userQuestion}</p>
        
        <h3>Le Passé</h3>
        <p>Interprétation du passé...</p>
        
        <h3>Le Présent</h3>
        <p>Interprétation du présent...</p>
        
        <h3>Le Futur</h3>
        <p>Interprétation du futur...</p>
        
        <h3>Synthèse</h3>
        <p>Synthèse globale...</p>`
    }
],
          temperature: 0.7,
          max_tokens: 1000 // Augmenter le nombre de tokens pour éviter la troncature
        })
      });

      // Vérifier si la réponse de l'API est valide
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API Mistral:", response.status, errorText);
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Vérifier que la réponse contient le contenu attendu
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let interpretation = data.choices[0].message.content;
        
        // Vérifier si l'interprétation est complète (contient les 4 sections)
        const hasPast = interpretation.includes("<h3>Le Passé</h3>");
        const hasPresent = interpretation.includes("<h3>Le Présent</h3>");
        const hasFuture = interpretation.includes("<h3>Le Futur</h3>");
        const hasSynthesis = interpretation.includes("<h3>Synthèse</h3>");
        
        // Si l'interprétation est incomplète, la compléter manuellement
        if (!hasPast || !hasPresent || !hasFuture || !hasSynthesis) {
          console.log("Interprétation incomplète détectée, complétion manuelle...");
          
          // Créer une interprétation complète
          const manualInterpretation = generateLocalInterpretation(past, present, future);
          
          // Si l'interprétation originale a certaines parties, les conserver
          if (hasPast && hasPresent && hasFuture) {
            // Il ne manque que la synthèse, ajouter uniquement cette partie
            interpretation += `
              <h3>Synthèse</h3>
              <p>La progression de ${past.name} à ${present.name}, puis vers ${future.name} raconte 
              une histoire cohérente de transformation. En reconnaissant les qualités du passé (${past.keywords}), 
              en embrassant les défis actuels (${present.keywords}), vous pourrez naviguer vers un avenir 
              qui manifeste les aspects positifs du ${future.name} (${future.keywords}).</p>
            `;
          } else {
            // Trop incomplet, utiliser l'interprétation complète générée localement
            interpretation = manualInterpretation;
          }
        }
        
        return res.status(200).json({ 
          interpretation: interpretation,
          source: "mistral" 
        });
      } else {
        throw new Error("Format de réponse inattendu de l'API Mistral");
      }
      
    } catch (apiError) {
      console.error("Erreur lors de l'appel à Mistral:", apiError);
      
      // Génération de repli si l'API échoue
      const interpretation = generateLocalInterpretation(past, present, future);
      
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

// Fonction helper pour générer une interprétation complète localement
function generateLocalInterpretation(past, present, future) {
  return `
    <h3>Le Passé</h3>
    <p>La carte ${past.name} dans la position du passé suggère que vous avez traversé une période 
    caractérisée par des éléments liés à ${past.keywords}. Ces expériences ont façonné 
    votre approche actuelle et continuent d'influencer vos décisions.</p>
    
    <h3>Le Présent</h3>
    <p>Dans votre situation actuelle, l'énergie de ${present.name} est prédominante. 
    Cette carte, associée à ${present.keywords}, indique que vous êtes dans une phase 
    où ces qualités sont particulièrement importantes à reconnaître et à intégrer dans 
    votre approche.</p>
    
    <h3>Le Futur</h3>
    <p>${future.name} apparaît comme la résultante probable de votre trajectoire actuelle. 
    Cette carte, liée à ${future.keywords}, suggère que les défis et opportunités à venir 
    seront teintés par ces aspects.</p>
    
    <h3>Synthèse</h3>
    <p>La progression de ${past.name} à ${present.name}, puis vers ${future.name} raconte 
    une histoire cohérente de transformation. La présence de ces trois arcanes majeurs 
    indique que vous traversez un cycle important de votre vie, avec des leçons significatives 
    à intégrer. Les énergies combinées de ces cartes suggèrent qu'en reconnaissant les 
    schémas du passé (${past.name}), en embrassant pleinement les défis actuels (${present.name}), 
    vous pourrez naviguer vers un avenir qui manifeste les aspects positifs de ${future.name}.</p>
  `;
}
