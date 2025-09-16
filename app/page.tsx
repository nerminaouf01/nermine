"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getEquipements } from "./affiche_equip/action"
import { updateEquipmentStock, getUpdatedEquipments } from "./updateStock"
import { 
  Layers, 
  PackageCheck, 
  Search, 
  ChevronDown, 
  ShoppingCart, 
  X,
  CheckCircle,
  Clock,
  BarChart3,
  Info,
  Calendar,
  RefreshCw,
  Truck,
  TrendingUp,
  Package,
  AlertCircle,
  Grid,
  List,
  Settings,
  User,
  Bell,
  Menu
} from "lucide-react"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, RadialLinearScale, Filler } from 'chart.js'
import { Pie, Bar, Line, Radar, Scatter } from 'react-chartjs-2'
import AjouterEquipementForm from "./addEquip/page"
import StockReportButton from "./components/StockReportButton"
import { logoutAction } from "./login/LogoutAction"
import { createEquipement } from "./actions/createEquipement"
import { getTechniciens, supprimerDemandeTechnicien } from "./action"
import { validerPanier } from "./actions/panieraction"

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, RadialLinearScale, Filler)

// Type definitions
type Equipement = {
  id: number
  code_imo: string
  nom_testeur: string
  nom_equipement: string
  designation: string
  date_mise_en_marche?: Date | null
  arborescence?: string | null
  date_garantie?: Date | null
  categorie: string
  nombre: number
  disponible?: boolean
  image?: string
  isFavorite?: boolean
}

type CartItem = Equipement & {
  quantity: number
}

type NotificationType = 'info' | 'warning' | 'error' | 'success';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
}

// Types for new features
type MaintenanceHistory = {
  id: number;
  equipementId: number;
  date: Date;
  type: 'preventive' | 'corrective';
  description: string;
  technician: string;
};

type EquipmentRating = {
  id: number;
  equipementId: number;
  rating: number;
  comment: string;
  userId: string;
  date: Date;
};

type PredictionData = {
  equipementId: number;
  predictedStock: number;
  confidence: number;
  nextMaintenance: Date;
};

// Types pour les fonctionnalités intelligentes
type SmartAlert = {
  id: string;
  type: 'stock' | 'maintenance' | 'warranty' | 'usage';
  message: string;
  priority: 'high' | 'medium' | 'low';
  equipmentId: number;
  date: Date;
};

type EquipmentUsage = {
  id: number;
  equipmentId: number;
  userId: string;
  startDate: Date;
  endDate?: Date;
  purpose: string;
  status: 'active' | 'completed' | 'cancelled';
};

type SmartSuggestion = {
  id: number;
  equipmentId: number;
  type: 'replacement' | 'maintenance' | 'upgrade';
  reason: string;
  priority: number;
  date: Date;
};

// Main component
export default function MagasinEquipements() {
  // State variables
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState({
    categorie: '',
    disponibilite: '',
    stockBas: false
  })
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [isOnline, setIsOnline] = useState(true) // Initialize to true
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  // Optional: logged-in user banner removed to avoid undefined access
  const [cachedData, setCachedData] = useState<Equipement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState('catalogue')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'nom' | 'categorie' | 'disponibilite' | 'quantite'>('nom')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({
    totalEquipements: 0,
    categories: {} as Record<string, number>,
    stockBas: 0,
    maintenance: 0
  })
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [equipmentRatings, setEquipmentRatings] = useState<EquipmentRating[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [showAR, setShowAR] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipement | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsage[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSmartPanel, setShowSmartPanel] = useState(false);
  const [tempQuantities, setTempQuantities] = useState<Record<number, number>>({});
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1)
  const [showQuantityInput, setShowQuantityInput] = useState<number | null>(null)
  const [techniciens, setTechniciens] = useState<any[]>([]);
  const [showTechniciansPanel, setShowTechniciansPanel] = useState(false);
  const [technicienDemandes, setTechnicienDemandes] = useState<Record<number, Equipement[]>>({});
  const [demandesEnAttente, setDemandesEnAttente] = useState<Array<{
    id: string;
    technicienId: number;
    technicien: any;
    equipements: Equipement[];
    dateCreation: Date;
    statut: 'en_attente' | 'approuvee' | 'refusee';
  }>>([]);

  // Fetch equipment data
  useEffect(() => {
    async function fetchEquipements() {
      setIsLoading(true)
      try {
        const data = await getEquipements()
        // Enhance data with additional properties
        const enhancedData = data.map((item: Equipement) => ({
          ...item,
          disponible: item.nombre > 0,
          date_mise_en_marche: item.date_mise_en_marche ? new Date(item.date_mise_en_marche) : undefined,
          date_garantie: item.date_garantie ? new Date(item.date_garantie) : undefined
        }))
        setEquipements(enhancedData)
      } catch (error) {
        console.error("Error fetching equipment:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEquipements()
  }, [])

  // Effect to handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // Fonction de recherche unifiée avec useMemo pour optimiser les performances
  const filteredEquipements = useMemo(() => {
    return equipements.filter(equip => {
      const matchesSearch = equip.nom_equipement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          equip.designation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategorie = !searchFilters.categorie || equip.categorie === searchFilters.categorie;
      const matchesDisponibilite = !searchFilters.disponibilite || 
                                  (searchFilters.disponibilite === 'disponible' && equip.disponible) ||
                                  (searchFilters.disponibilite === 'indisponible' && !equip.disponible);
      const matchesStockBas = !searchFilters.stockBas || equip.nombre <= 5;

      return matchesSearch && matchesCategorie && matchesDisponibilite && matchesStockBas;
    });
  }, [equipements, searchQuery, searchFilters]);

  // Extract unique categories
  const categories = ["Tous", ...Array.from(new Set(equipements.map(e => e.categorie)))]

  // Cart functions
  const addToCart = async (equipement: Equipement) => {
    if (equipement.nombre <= 0) {
      showNotification("Cet équipement n'est plus disponible en stock", "error")
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Ajouter au panier avec quantité 1
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.id === equipement.id)
        if (existingItem) {
          return prevCart.map(item => 
            item.id === equipement.id 
              ? { ...item, quantity: item.quantity + 1 } 
              : item
          )
        } else {
          return [...prevCart, { ...equipement, quantity: 1 }]
        }
      })
      
      showNotification(`${equipement.nom_equipement} ajouté au panier`, "success")
    } catch (error) {
      console.error("Erreur lors de l'ajout au panier:", error)
      showNotification("Une erreur est survenue lors de l'ajout au panier", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFromCart = async (id: number) => {
    const itemToRemove = cart.find(item => item.id === id)
    if (!itemToRemove) return
    
    try {
      setIsProcessing(true)
      
      // Récupérer l'équipement
      const equipement = equipements.find(e => e.id === id)
      if (!equipement) return
      
      // Mettre à jour le stock dans la base de données
      const itemsToUpdate = [{
        id: id,
        quantity: equipement.nombre + itemToRemove.quantity // Remettre le stock
      }]
      
      const result = await updateEquipmentStock(itemsToUpdate)
      
      if (result.success) {
        // Mettre à jour l'état local
        setEquipements(prev => prev.map(e => 
          e.id === id 
            ? { ...e, nombre: e.nombre + itemToRemove.quantity, disponible: true }
            : e
        ))
        
        // Retirer du panier
        setCart(prevCart => prevCart.filter(item => item.id !== id))
        
        showNotification(`${itemToRemove.nom_equipement} retiré du panier`, "info")
      } else {
        showNotification("Erreur lors de la mise à jour du stock", "error")
      }
    } catch (error) {
      console.error("Erreur lors du retrait du panier:", error)
      showNotification("Une erreur est survenue lors du retrait du panier", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    
    const equipement = equipements.find(e => e.id === id)
    if (!equipement) return
    
    // Vérifier si la nouvelle quantité est disponible
    if (quantity > equipement.nombre) {
      showNotification(`Stock insuffisant. Disponible: ${equipement.nombre}`, "warning")
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Mettre à jour le panier
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      )
      
      showNotification(`Quantité mise à jour pour ${equipement.nom_equipement}`, "success")
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la quantité:", error)
      showNotification("Une erreur est survenue lors de la mise à jour de la quantité", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Nouvelle fonction pour mettre à jour le stock
  const updateStock = async (id: number, quantity: number) => {
    const equipement = equipements.find(e => e.id === id)
    if (!equipement) return

    if (quantity > equipement.nombre) {
      showNotification(`Stock insuffisant. Disponible: ${equipement.nombre}`, "warning")
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Mettre à jour le stock dans la base de données
      const itemsToUpdate = [{
        id: id,
        quantity: equipement.nombre - quantity
      }]
      
      const result = await updateEquipmentStock(itemsToUpdate)
      
      if (result.success) {
        // Mettre à jour l'état local
        setEquipements(prev => prev.map(e => 
          e.id === id 
            ? { ...e, nombre: e.nombre - quantity, disponible: e.nombre - quantity > 0 }
            : e
        ))
        
        showNotification(`Stock mis à jour pour ${equipement.nom_equipement}`, "success")
      } else {
        showNotification("Erreur lors de la mise à jour du stock", "error")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du stock:", error)
      showNotification("Une erreur est survenue lors de la mise à jour du stock", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate total items in cart
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Format date for display
  const formatDate = (date: Date | undefined | null): string => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString('fr-FR')
  }

  // Place an order
  const placeOrder = async () => {
    if (cart.length === 0) return
    
    try {
      setIsProcessing(true)
      
      // Préparer les données pour la validation du panier
      const itemsToValidate = cart.map(item => ({
        id: item.id,
        quantity: item.quantity // Quantité à soustraire
      }))
      
      // Appel à la fonction serveur pour valider le panier
      const result = await validerPanier(itemsToValidate)
      
      if (result.success) {
        // Mettre à jour l'état local des équipements
        setEquipements(prev => {
          const newEquipements = [...prev]
          if (result.updatedItems) {
            result.updatedItems.forEach((updated: any) => {
              const index = newEquipements.findIndex(e => e.id === updated.id)
              if (index !== -1) {
                newEquipements[index] = {
                  ...newEquipements[index],
                  nombre: updated.nombre,
                  disponible: updated.nombre > 0
                }
              }
            })
          }
          return newEquipements
        })
        // Confirmation de la commande
        setOrderPlaced(true)
        showNotification("Commande envoyée avec succès!", "success")
        setTimeout(() => {
          setCart([])
          setOrderPlaced(false)
          setShowCart(false)
        }, 3000)
      } else {
        showNotification(result.error || "Erreur lors de la validation du panier.", "error")
      }
    } catch (error) {
      console.error("Erreur lors du traitement de la commande:", error)
      showNotification("Une erreur est survenue lors du traitement de votre commande.", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Sample recent orders data
  const recentOrders = [
    { id: 1, date: "04/05/2025", status: "Livré", items: 5 },
    { id: 2, date: "28/04/2025", status: "En cours", items: 3 },
    { id: 3, date: "15/04/2025", status: "Livré", items: 8 }
  ]

  // Toggle between detailed and simple view
  const toggleView = () => {
    setShowDetailedView(!showDetailedView)
  }

  // Toggle between grid and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid")
  }

  // Notification system (simplified implementation)
  const showNotification = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date(), read: false }])
    
    // Auto-remove notification after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id))
    }, 3000)
  }

  // Sort function
  const handleSort = (criteria: "nom" | "categorie" | "disponibilite" | "quantite") => {
    if (sortBy === criteria) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(criteria)
      setSortDirection("asc")
    }
  }

  // Dashboard statistics
  const dashboardStats = {
    availableEquipment: equipements.filter(e => e.disponible).length,
    totalEquipment: equipements.length,
    monthlyOrders: 12,
    categoriesCount: categories.length - 1,
    lowStockItems: equipements.filter(e => e.nombre > 0 && e.nombre <= 3).length
  }

  // Fonction pour gérer les favoris
  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(favId => favId !== id)
        : [...prev, id]
    )
  }

  // Calcul des statistiques
  useEffect(() => {
    const newStats = {
      totalEquipements: equipements.length,
      categories: equipements.reduce((acc, equip) => {
        acc[equip.categorie] = (acc[equip.categorie] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      stockBas: equipements.filter(e => e.nombre <= 5).length,
      maintenance: equipements.filter(e => !e.disponible).length
    };
    setStats(newStats);
  }, [equipements]);

  // Fonction pour ajouter une notification
  const addNotification = (message: string, type: NotificationType) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Vérification du stock bas
  useEffect(() => {
    equipements.forEach(equip => {
      if (equip.nombre <= 5) {
        addNotification(
          `Stock bas pour ${equip.nom_equipement} (${equip.nombre} restants)`,
          'warning'
        );
      }
    });
  }, [equipements]);

  // Gestion du mode hors-ligne
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Mise en cache des données
    if (isOnline) {
      setCachedData(equipements);
      localStorage.setItem('cachedEquipements', JSON.stringify(equipements));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, equipements]);

  // Chargement des données en cache au démarrage
  useEffect(() => {
    const cached = localStorage.getItem('cachedEquipements');
    if (cached) {
      setCachedData(JSON.parse(cached));
    }
  }, []);

  // Fonction pour planifier la maintenance
  const scheduleMaintenance = (equipId: number, date: Date) => {
    const equip = equipements.find(e => e.id === equipId);
    if (equip) {
      addNotification(
        `Maintenance planifiée pour ${equip.nom_equipement} le ${date.toLocaleDateString()}`,
        'info'
      );
    }
  };

  // Function to generate predictions
  const generatePredictions = useCallback(() => {
    const newPredictions = equipements.map(equip => ({
      equipementId: equip.id,
      predictedStock: Math.max(0, equip.nombre - Math.floor(Math.random() * 5)),
      confidence: 0.8 + Math.random() * 0.2,
      nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));
    setPredictions(newPredictions);
  }, [equipements]);

  // Update predictions
  useEffect(() => {
    generatePredictions();
    const interval = setInterval(generatePredictions, 24 * 60 * 60 * 1000); // Daily update
    return () => clearInterval(interval);
  }, [generatePredictions]);

  // Function to add maintenance
  const addMaintenance = (equipId: number, type: 'preventive' | 'corrective', description: string) => {
    const newMaintenance: MaintenanceHistory = {
      id: Date.now(),
      equipementId: equipId,
      date: new Date(),
      type,
      description,
      technician: 'Sagemcom Technician' // To be replaced with the logged-in user
    };
    setMaintenanceHistory(prev => [...prev, newMaintenance]);
    addNotification(`Maintenance ${type} added for equipment #${equipId}`, 'info');
  };

  // Function to add rating
  const addRating = (equipId: number, rating: number, comment: string) => {
    const newRating: EquipmentRating = {
      id: Date.now(),
      equipementId: equipId,
      rating,
      comment,
      userId: 'User', // To be replaced with the logged-in user
      date: new Date()
    };
    setEquipmentRatings(prev => [...prev, newRating]);
    addNotification('Rating added successfully', 'success');
  };

  // Fonction utilitaire pour générer des IDs uniques
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fonction pour analyser les données et générer des alertes intelligentes
  const generateSmartAlerts = useCallback(() => {
    const newAlerts: SmartAlert[] = [];

    equipements.forEach(equip => {
      // Alerte de stock bas
      if (equip.nombre <= 5) {
        newAlerts.push({
          id: generateUniqueId(),
          type: 'stock',
          message: `Stock bas pour ${equip.nom_equipement} (${equip.nombre} restants)`,
          priority: equip.nombre <= 0 ? 'high' : 'medium',
          equipmentId: equip.id,
          date: new Date()
        });
      }

      // Alerte de maintenance
      if (equip.date_mise_en_marche) {
        const monthsInUse = (new Date().getTime() - new Date(equip.date_mise_en_marche).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsInUse > 6) {
          newAlerts.push({
            id: generateUniqueId(),
            type: 'maintenance',
            message: `${equip.nom_equipement} nécessite une maintenance préventive`,
            priority: 'medium',
            equipmentId: equip.id,
            date: new Date()
          });
        }
      }

      // Alerte de garantie
      if (equip.date_garantie) {
        const daysUntilWarranty = (new Date(equip.date_garantie).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilWarranty < 30) {
          newAlerts.push({
            id: generateUniqueId(),
            type: 'warranty',
            message: `La garantie de ${equip.nom_equipement} expire dans ${Math.ceil(daysUntilWarranty)} jours`,
            priority: 'high',
            equipmentId: equip.id,
            date: new Date()
          });
        }
      }
    });

    setSmartAlerts(newAlerts);
  }, [equipements]);

  // Mise à jour des alertes intelligentes
  useEffect(() => {
    generateSmartAlerts();
    const interval = setInterval(generateSmartAlerts, 1000 * 60 * 60); // Mise à jour toutes les heures
    return () => clearInterval(interval);
  }, [generateSmartAlerts]);

  // Fonction pour générer des suggestions intelligentes
  const generateSmartSuggestions = useCallback(() => {
    const newSuggestions: SmartSuggestion[] = [];

    equipements.forEach(equip => {
      // Suggestion de remplacement basée sur l'âge
      if (equip.date_mise_en_marche) {
        const yearsInUse = (new Date().getTime() - new Date(equip.date_mise_en_marche).getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (yearsInUse > 3) {
          newSuggestions.push({
            id: Number(generateUniqueId()),
            equipmentId: equip.id,
            type: 'replacement',
            reason: `Équipement en service depuis ${Math.floor(yearsInUse)} ans`,
            priority: yearsInUse > 5 ? 1 : 2,
            date: new Date()
          });
        }
      }

      // Suggestion de maintenance basée sur l'utilisation
      const usageCount = equipmentUsage.filter(u => u.equipmentId === equip.id).length;
      if (usageCount > 100) {
        newSuggestions.push({
          id: Number(generateUniqueId()),
          equipmentId: equip.id,
          type: 'maintenance',
          reason: `Forte utilisation détectée (${usageCount} utilisations)`,
          priority: 2,
          date: new Date()
        });
      }
    });

    setSmartSuggestions(newSuggestions);
  }, [equipements, equipmentUsage]);

  // Mise à jour des suggestions
  useEffect(() => {
    generateSmartSuggestions();
    const interval = setInterval(generateSmartSuggestions, 1000 * 60 * 60 * 24); // Mise à jour quotidienne
    return () => clearInterval(interval);
  }, [generateSmartSuggestions]);

  // Function to update equipment quantity
  const updateEquipmentQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    try {
      setIsProcessing(true);
      
      // Prepare data for stock update
      const itemsToUpdate = [{
        id: id,
        quantity: newQuantity
      }];
      
      // Call server action to update stock
      const result = await updateEquipmentStock(itemsToUpdate);
      
      if (result.success) {
        // Get updated equipment data
        const updatedItems = await getUpdatedEquipments([id]);
        
        // Update local equipment state
        setEquipements(prev => {
          const newEquipements = [...prev];
          updatedItems.forEach((updated: Equipement) => {
            const index = newEquipements.findIndex(e => e.id === updated.id);
            if (index !== -1) {
              newEquipements[index] = {
                ...newEquipements[index],
                nombre: updated.nombre,
                disponible: updated.nombre > 0
              };
            }
          });
          return newEquipements;
        });
        
        showNotification(`Quantité mise à jour pour l'équipement #${id}`, "success");
      } else {
        showNotification("Erreur lors de la mise à jour du stock. Veuillez réessayer.", "error");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du stock:", error);
      showNotification("Une erreur est survenue lors de la mise à jour du stock.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction pour gérer les changements temporaires
  const handleQuantityChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setTempQuantities(prev => ({
      ...prev,
      [id]: numValue
    }));
  };

  // Handler pour le clic sur la cloche de notification
  const handleNotificationClick = async () => {
    const data = await getTechniciens();
    setTechniciens(data);
    setShowTechniciansPanel(true);
  };

  // Fonction pour générer une demande aléatoire
  const genererDemandeAleatoire = useCallback(() => {
    if (techniciens.length === 0 || equipements.length === 0) return;

    // Choisir un technicien aléatoire
    const technicienAleatoire = techniciens[Math.floor(Math.random() * techniciens.length)];
    
    // Choisir 1 à 4 équipements aléatoires
    const nombreEquipements = Math.floor(Math.random() * 4) + 1;
    const equipementsAleatoires = equipements
      .sort(() => 0.5 - Math.random())
      .slice(0, nombreEquipements);

    const nouvelleDemande = {
      id: `demande_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      technicienId: technicienAleatoire.id,
      technicien: technicienAleatoire,
      equipements: equipementsAleatoires,
      dateCreation: new Date(),
      statut: 'en_attente' as const
    };

    setDemandesEnAttente(prev => [...prev, nouvelleDemande]);
    showNotification(`Nouvelle demande de ${technicienAleatoire.prenom} ${technicienAleatoire.nom}`, 'info');
  }, [techniciens, equipements, showNotification]);

  // Effet pour générer des demandes automatiquement
  useEffect(() => {
    const interval = setInterval(() => {
      // 30% de chance de générer une nouvelle demande toutes les 10-30 secondes
      if (Math.random() < 0.3) {
        genererDemandeAleatoire();
      }
    }, Math.random() * 20000 + 10000); // Entre 10 et 30 secondes

    return () => clearInterval(interval);
  }, [genererDemandeAleatoire]);

  // Fonction pour approuver une demande
  const approuverDemande = async (demandeId: string) => {
    setDemandesEnAttente(prev => 
      prev.map(demande => 
        demande.id === demandeId 
          ? { ...demande, statut: 'approuvee' as const }
          : demande
      )
    );
    
    // Supprimer la demande après 3 secondes
    setTimeout(() => {
      setDemandesEnAttente(prev => prev.filter(d => d.id !== demandeId));
    }, 3000);
    
    showNotification('Demande approuvée avec succès', 'success');
  };

  // Fonction pour refuser une demande
  const refuserDemande = async (demandeId: string) => {
    setDemandesEnAttente(prev => 
      prev.map(demande => 
        demande.id === demandeId 
          ? { ...demande, statut: 'refusee' as const }
          : demande
      )
    );
    
    // Supprimer la demande après 3 secondes
    setTimeout(() => {
      setDemandesEnAttente(prev => prev.filter(d => d.id !== demandeId));
    }, 3000);
    
    showNotification('Demande refusée', 'error');
  };

  const handleCreateEquipement = async (formData: FormData): Promise<void> => {
    const result = await createEquipement(formData)
    if (result && (result as any).ok) {
      showNotification('Équipement ajouté avec succès', 'success')
      setShowAddModal(false)
      // Optionally refresh equipment list
      try {
        const updated = await getUpdatedEquipments([])
        if (Array.isArray(updated)) {
          setEquipements(updated.map((item: any) => ({
            ...item,
            disponible: item.nombre > 0,
            date_mise_en_marche: item.date_mise_en_marche ? new Date(item.date_mise_en_marche) : undefined,
            date_garantie: item.date_garantie ? new Date(item.date_garantie) : undefined
          })))
        }
      } catch {}
    } else {
      const errorMsg = (result as any)?.error || "Erreur lors de l'ajout"
      showNotification(errorMsg, 'error')
    }
  }

  return (
    <>
      <div className="mb-4 text-lg font-semibold text-center">Bienvenue</div>
      <div className={`min-h-screen font-sans ${
        maintenanceMode 
          ? 'bg-orange-50 text-orange-900' 
          : 'bg-slate-50 text-slate-800'
      }`}>
        {/* Header with professional design */}
        <header className={`shadow-sm sticky top-0 z-30 border-b ${
          maintenanceMode 
            ? 'bg-white border-orange-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-md ${
                  maintenanceMode 
                    ? 'text-orange-700 bg-orange-100' 
                    : 'text-slate-700 bg-slate-100'
                }`}>
                  <Layers size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold flex items-center gap-2">
                    <span className={maintenanceMode ? 'text-orange-900' : 'text-slate-900'}>
                      Sagemcom
                    </span>
                    <span className={`text-xs font-normal px-2 py-1 rounded ${
                      maintenanceMode 
                        ? 'text-orange-700 bg-orange-100' 
                        : 'text-slate-500 bg-slate-100'
                    }`}>
                      BETA
                    </span>
                  </h1>
                  <p className={`text-sm ${
                    maintenanceMode ? 'text-orange-600' : 'text-slate-500'
                  }`}>Magasin Interne</p>
                </div>
                <StockReportButton />
              </div>
              
              {/* Navigation with professional styling */}
              <div className="hidden md:flex items-center space-x-6">
                {maintenanceMode && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md shadow-sm transition-colors text-white bg-orange-600 hover:bg-orange-700"
                    title="Ajouter un article"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                    Ajouter un article
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className={`text-sm font-medium border-b-2 py-3 transition-colors ${
                    activeTab === "dashboard" 
                      ? maintenanceMode
                        ? 'text-orange-900 border-orange-900'
                        : 'text-slate-900 border-slate-900'
                      : maintenanceMode
                        ? 'text-orange-600 border-transparent hover:text-orange-900 hover:border-orange-300'
                        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} />
                    <span>Tableau de bord</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => setActiveTab("catalogue")}
                  className={`text-sm font-medium border-b-2 py-3 transition-colors ${
                    activeTab === "catalogue" 
                      ? maintenanceMode
                        ? 'text-orange-900 border-orange-900'
                        : 'text-slate-900 border-slate-900'
                      : maintenanceMode
                        ? 'text-orange-600 border-transparent hover:text-orange-900 hover:border-orange-300'
                        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>Catalogue</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowCart(true)}
                  className={`relative flex items-center transition-colors ${
                    maintenanceMode
                      ? 'text-orange-700 hover:text-orange-900'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className={`p-2 rounded-md ${
                    maintenanceMode ? 'bg-orange-100' : 'bg-slate-100'
                  }`}>
                    <ShoppingCart size={20} />
                    {totalItems > 0 && (
                      <span className={`absolute -top-2 -right-2 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center ${
                        maintenanceMode ? 'bg-orange-600' : 'bg-slate-900'
                      }`}>
                        {totalItems}
                      </span>
                    )}
                  </div>
                </button>
                
                <div className={`flex items-center gap-3 ${
                  maintenanceMode ? 'text-orange-600' : 'text-slate-600'
                }`}>
                  <button 
                    onClick={handleNotificationClick}
                    className={`p-2 rounded-md transition-colors ${maintenanceMode ? 'hover:bg-orange-100' : 'hover:bg-slate-100'}`}
                  >
                    <Bell size={16} />
                  </button>
                  <button 
                    onClick={genererDemandeAleatoire}
                    className={`p-2 rounded-md transition-colors ${maintenanceMode ? 'hover:bg-orange-100' : 'hover:bg-slate-100'}`}
                    title="Générer une demande aléatoire"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button className={`p-2 rounded-md transition-colors ${
                    maintenanceMode ? 'hover:bg-orange-100' : 'hover:bg-slate-100'
                  }`}>
                    <User size={16} />
                  </button>
                  <button className={`p-2 rounded-md transition-colors ${
                    maintenanceMode ? 'hover:bg-orange-100' : 'hover:bg-slate-100'
                  }`}>
                    <Settings size={16} />
                  </button>
                </div>
                <button 
                  onClick={async () => { await logoutAction(); }}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition-colors`}
                  style={{ marginLeft: '16px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Modal d'ajout d'article */}
        {showAddModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
            <div className="relative z-50 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Ajouter un nouvel article</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded hover:bg-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form action={handleCreateEquipement} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Code IMO</label>
                  <input name="code_imo" className="border rounded px-3 py-2" placeholder="IMO-1234" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Nom testeur</label>
                  <input name="nom_testeur" className="border rounded px-3 py-2" placeholder="John Doe" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Nom équipement</label>
                  <input name="nom_equipement" className="border rounded px-3 py-2" placeholder="Oscilloscope" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Désignation</label>
                  <input name="designation" className="border rounded px-3 py-2" placeholder="Modèle XYZ" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Date mise en marche</label>
                  <input type="date" name="date_mise_en_marche" className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Arborescence</label>
                  <input name="arborescence" className="border rounded px-3 py-2" placeholder="Magasin/A/B" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Date garantie</label>
                  <input type="date" name="date_garantie" className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Catégorie</label>
                  <input name="categorie" className="border rounded px-3 py-2" placeholder="Instruments" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Nombre</label>
                  <input type="number" min="0" name="nombre" className="border rounded px-3 py-2" placeholder="0" />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section des demandes en attente */}
        {demandesEnAttente.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Bell size={20} className="text-orange-600" />
                Demandes en attente ({demandesEnAttente.filter(d => d.statut === 'en_attente').length})
              </h2>
              <div className="space-y-3">
                {demandesEnAttente.map((demande) => (
                  <motion.div
                    key={demande.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      demande.statut === 'en_attente' 
                        ? 'bg-blue-50 border-blue-200' 
                        : demande.statut === 'approuvee'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {demande.technicien.image && (
                            <img 
                              src={demande.technicien.image} 
                              alt="avatar" 
                              className="w-8 h-8 rounded-full" 
                            />
                          )}
                          <div>
                            <h3 className="font-medium text-slate-900">
                              {demande.technicien.prenom} {demande.technicien.nom}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {demande.dateCreation.toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            demande.statut === 'en_attente' 
                              ? 'bg-blue-100 text-blue-800' 
                              : demande.statut === 'approuvee'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {demande.statut === 'en_attente' ? 'En attente' : 
                             demande.statut === 'approuvee' ? 'Approuvée' : 'Refusée'}
                          </span>
                        </div>
                        
                        <div className="ml-11">
                          <p className="text-sm text-slate-600 mb-2">
                            Demande d'équipements :
                          </p>
                          <ul className="space-y-1">
                            {demande.equipements.map((equipement) => (
                              <li key={equipement.id} className="text-sm text-slate-700 flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                                <span className="font-medium">{equipement.nom_equipement}</span>
                                <span className="text-slate-500">— {equipement.designation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {demande.statut === 'en_attente' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => approuverDemande(demande.id)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => refuserDemande(demande.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content with professional styling */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className={maintenanceMode ? 'text-orange-600' : 'text-slate-600'}>
                <RefreshCw size={32} className="animate-spin" />
              </div>
              <p className={`ml-4 ${maintenanceMode ? 'text-orange-600' : 'text-slate-600'}`}>
                Chargement des équipements...
              </p>
            </div>
          ) : activeTab === "catalogue" ? (
            <div>
              {/* Professional search bar */}
              <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher un équipement..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full px-4 py-2 rounded-md border bg-white focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors ${
                          maintenanceMode 
                            ? 'border-orange-200 focus:ring-orange-400 focus:border-orange-400' 
                            : 'border-slate-200'
                        }`}
                      />
                      <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        maintenanceMode ? 'text-orange-400' : 'text-slate-400'
                      }`} size={18} />
                    </div>
                  </div>
                  <select
                    value={searchFilters.categorie}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, categorie: e.target.value }))}
                    className={`px-4 py-2 rounded-md border bg-white focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors ${
                      maintenanceMode 
                        ? 'border-orange-200 focus:ring-orange-400 focus:border-orange-400' 
                        : 'border-slate-200'
                    }`}
                  >
                    <option value="">Toutes les catégories</option>
                    <option value="Bricolage">Bricolage</option>
                    <option value="Sécurité">Sécurité</option>
                    <option value="Electronique">Electronique</option>
                    <option value="Mécanique">Mécanique</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Autre">Autre</option>
                  </select>
                  
                  <select
                    value={searchFilters.disponibilite}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, disponibilite: e.target.value }))}
                    className={`px-4 py-2 rounded-md border bg-white focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors ${
                      maintenanceMode 
                        ? 'border-orange-200 focus:ring-orange-400 focus:border-orange-400' 
                        : 'border-slate-200'
                    }`}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="disponible">Disponible</option>
                    <option value="indisponible">Indisponible</option>
                  </select>
                  <label className={`flex items-center gap-2 px-4 py-2 bg-white rounded-md border ${
                    maintenanceMode ? 'border-orange-200' : 'border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={searchFilters.stockBas}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, stockBas: e.target.checked }))}
                      className={`w-4 h-4 focus:ring-slate-400 border-slate-300 rounded ${
                        maintenanceMode ? 'text-orange-600' : 'text-slate-600'
                      }`}
                    />
                    Stock bas
                  </label>
                </div>
              </div>

              {/* Equipment cards with professional design */}
              {filteredEquipements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEquipements.map((e, index) => (
                    <div
                      key={e.id}
                      className={`bg-white rounded-md overflow-hidden shadow-sm border hover:shadow-md transition-shadow ${
                        maintenanceMode ? 'border-orange-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className={`text-base font-medium ${
                              maintenanceMode ? 'text-orange-900' : 'text-slate-900'
                            }`}>{e.nom_equipement}</h3>
                            <p className={maintenanceMode ? 'text-orange-500' : 'text-slate-500'}>{e.code_imo}</p>
                          </div>
                          <span 
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              e.disponible 
                                ? maintenanceMode
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-700'
                                : maintenanceMode
                                  ? 'bg-rose-100 text-rose-500'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {e.disponible ? 'Disponible' : 'Indisponible'}
                          </span>
                        </div>
                        
                        <p className={`text-sm mb-3 line-clamp-2 ${
                          maintenanceMode ? 'text-rose-600' : 'text-slate-600'
                        }`}>{e.designation}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            maintenanceMode
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {e.categorie}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            maintenanceMode
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {e.nom_testeur}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-sm">
                            <span className={maintenanceMode ? 'text-rose-500' : 'text-slate-500'}>Stock: </span>
                            {maintenanceMode ? (
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center border rounded-md ${
                                  maintenanceMode ? 'border-rose-200' : 'border-slate-200'
                                }`}>
                                  <button
                                    onClick={() => updateEquipmentQuantity(e.id, e.nombre - 1)}
                                    className={`px-2 py-1 ${
                                      maintenanceMode
                                        ? 'text-rose-600 hover:bg-rose-50'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    disabled={e.nombre <= 0 || isProcessing}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={tempQuantities[e.id] !== undefined ? tempQuantities[e.id] : e.nombre}
                                    onChange={(event) => handleQuantityChange(e.id, event.target.value)}
                                    className={`w-16 px-2 py-1 text-center border-x focus:outline-none focus:ring-1 ${
                                      maintenanceMode
                                        ? 'border-rose-200 focus:ring-rose-400'
                                        : 'border-slate-200 focus:ring-slate-400'
                                    }`}
                                    disabled={isProcessing}
                                  />
                                  <button
                                    onClick={() => updateEquipmentQuantity(e.id, e.nombre + 1)}
                                    className={`px-2 py-1 ${
                                      maintenanceMode
                                        ? 'text-rose-600 hover:bg-rose-50'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    disabled={isProcessing}
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => updateEquipmentQuantity(e.id, tempQuantities[e.id] || e.nombre)}
                                  disabled={isProcessing || tempQuantities[e.id] === undefined || tempQuantities[e.id] === e.nombre}
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    maintenanceMode
                                      ? 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400'
                                      : 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400'
                                  } disabled:cursor-not-allowed`}
                                >
                                  {isProcessing ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    "Valider"
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className={`font-medium ${
                                e.nombre === 0 
                                  ? maintenanceMode ? 'text-rose-500' : 'text-slate-500'
                                  : e.nombre <= 3 
                                    ? maintenanceMode ? 'text-rose-700' : 'text-slate-700'
                                    : maintenanceMode ? 'text-rose-900' : 'text-slate-900'
                              }`}>
                                {e.nombre}
                              </span>
                            )}
                          </div>
                          
                          {!maintenanceMode && (
                            <div className="flex items-center gap-2">
                              {showQuantityInput === e.id ? (
                                <>
                                  <div className="flex items-center border rounded-md">
                                    <button
                                      onClick={() => setQuantityToAdd(prev => Math.max(1, prev - 1))}
                                      className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={e.nombre}
                                      value={quantityToAdd}
                                      onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-16 px-2 py-1 text-center border-x focus:outline-none focus:ring-1 border-slate-200 focus:ring-slate-400"
                                    />
                                    <button
                                      onClick={() => setQuantityToAdd(prev => Math.min(e.nombre, prev + 1))}
                                      className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => updateStock(e.id, quantityToAdd)}
                                    className="px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
                                  >
                                    Mettre à jour le stock
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowQuantityInput(null)
                                      setQuantityToAdd(1)
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-200 transition-colors"
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => addToCart(e)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                                  >
                                    <ShoppingCart size={14} className="mr-1.5" />
                                    Ajouter
                                  </button>
                                  <button
                                    onClick={() => setShowQuantityInput(e.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-colors"
                                  >
                                    Mettre à jour le stock
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Professional empty state
                <div className={`text-center py-12 bg-white rounded-md shadow-sm border ${
                  maintenanceMode ? 'border-rose-200' : 'border-slate-200'
                }`}>
                  <div className="mx-auto flex flex-col items-center">
                    <PackageCheck size={48} className={maintenanceMode ? 'text-rose-300' : 'text-slate-300'} />
                    <h3 className={`text-lg font-medium ${
                      maintenanceMode ? 'text-rose-900' : 'text-slate-900'
                    }`}>Aucun équipement trouvé</h3>
                    <p className={`mt-1 ${
                      maintenanceMode ? 'text-rose-500' : 'text-slate-500'
                    }`}>Essayez de modifier vos critères de recherche</p>
                    <button 
                      onClick={() => {
                        setSearchQuery("")
                        setSearchFilters({
                          categorie: '',
                          disponibilite: '',
                          stockBas: false
                        })
                      }}
                      className={`mt-4 font-medium flex items-center gap-1.5 ${
                        maintenanceMode
                          ? 'text-rose-600 hover:text-rose-900'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <RefreshCw size={14} />
                      Réinitialiser les filtres
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Dashboard view with professional styling
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Tableau de Bord</h2>
              
              {/* Stats Cards with professional design */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-1">Total Équipements</h3>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalEquipements}</p>
                </div>
                
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-1">Stock Bas</h3>
                  <p className="text-2xl font-semibold text-slate-900">{stats.stockBas}</p>
                </div>
                
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-1">En Maintenance</h3>
                  <p className="text-2xl font-semibold text-slate-900">{stats.maintenance}</p>
                </div>
                
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-1">Favoris</h3>
                  <p className="text-2xl font-semibold text-slate-900">{favorites.length}</p>
                </div>
              </div>

              {/* Nouveaux tableaux de bord avec diagrammes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Diagramme circulaire des catégories amélioré */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Répartition par Catégorie</h3>
                  <div className="h-64">
                    <Pie
                      data={{
                        labels: Object.keys(stats.categories),
                        datasets: [{
                          data: Object.values(stats.categories),
                          backgroundColor: [
                            'rgba(100, 116, 139, 0.8)',
                            'rgba(71, 85, 105, 0.8)',
                            'rgba(51, 65, 85, 0.8)',
                            'rgba(30, 41, 59, 0.8)',
                            'rgba(15, 23, 42, 0.8)',
                          ],
                          borderColor: [
                            'rgba(100, 116, 139, 1)',
                            'rgba(71, 85, 105, 1)',
                            'rgba(51, 65, 85, 1)',
                            'rgba(30, 41, 59, 1)',
                            'rgba(15, 23, 42, 1)',
                          ],
                          borderWidth: 1,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: {
                              font: {
                                size: 12
                              },
                              padding: 20
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                const label = context.label || '';
                                const value = Number(context.raw) || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + Number(b), 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        },
                        animation: {
                          animateScale: true,
                          animateRotate: true
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Nouveau graphique de tendance temporelle */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Tendance du Stock</h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                        datasets: [{
                          label: 'Stock moyen',
                          data: [65, 59, 80, 81, 56, 55],
                          fill: true,
                          backgroundColor: 'rgba(100, 116, 139, 0.2)',
                          borderColor: 'rgba(100, 116, 139, 1)',
                          tension: 0.4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Nouvelle section pour les diagrammes avancés */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Diagramme radar pour les performances */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Performance des Équipements</h3>
                  <div className="h-64">
                    <Radar
                      data={{
                        labels: ['Disponibilité', 'Maintenance', 'Utilisation', 'Fiabilité', 'Efficacité'],
                        datasets: [{
                          label: 'Performance moyenne',
                          data: [85, 75, 90, 80, 85],
                          backgroundColor: 'rgba(100, 116, 139, 0.2)',
                          borderColor: 'rgba(100, 116, 139, 1)',
                          pointBackgroundColor: 'rgba(100, 116, 139, 1)',
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: 'rgba(100, 116, 139, 1)'
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            angleLines: {
                              display: true
                            },
                            suggestedMin: 0,
                            suggestedMax: 100
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Graphique de dispersion pour les corrélations */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Corrélation Utilisation/Maintenance</h3>
                  <div className="h-64">
                    <Scatter
                      data={{
                        datasets: [{
                          label: 'Équipements',
                          data: [
                            { x: 20, y: 30 },
                            { x: 40, y: 50 },
                            { x: 60, y: 70 },
                            { x: 80, y: 90 },
                            { x: 100, y: 110 }
                          ],
                          backgroundColor: 'rgba(100, 116, 139, 0.8)'
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            title: {
                              display: true,
                              text: 'Utilisation (%)'
                            }
                          },
                          y: {
                            title: {
                              display: true,
                              text: 'Maintenance (%)'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Timeline des maintenances */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Timeline des Maintenances</h3>
                  <div className="h-64 overflow-y-auto">
                    {maintenanceHistory
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((maintenance, index) => (
                        <div key={maintenance.id} className="flex items-start mb-4">
                          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-slate-400"></div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-slate-900">
                              {equipements.find(e => e.id === maintenance.equipementId)?.nom_equipement}
                            </p>
                            <p className="text-xs text-slate-500">{maintenance.type}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(maintenance.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Tableaux de bord supplémentaires avec diagrammes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* État du stock avec diagramme */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">État du Stock</h3>
                  <div className="h-48 mb-4">
                    <Pie
                      data={{
                        labels: ['Stock optimal', 'Stock moyen', 'Stock bas'],
                        datasets: [{
                          data: [
                            equipements.filter(e => e.nombre > 10).length,
                            equipements.filter(e => e.nombre > 5 && e.nombre <= 10).length,
                            equipements.filter(e => e.nombre <= 5).length
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(249, 115, 22, 0.8)'
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(234, 179, 8, 1)',
                            'rgba(249, 115, 22, 1)'
                          ],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              font: {
                                size: 11
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">En stock optimal</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => e.nombre > 10).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Stock moyen</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => e.nombre > 5 && e.nombre <= 10).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Stock bas</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => e.nombre <= 5).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Maintenance avec diagramme */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Maintenance</h3>
                  <div className="h-48 mb-4">
                    <Bar
                      data={{
                        labels: ['Préventive', 'Corrective', 'Planifiée'],
                        datasets: [{
                          label: 'Nombre d\'équipements',
                          data: [
                            maintenanceHistory.filter(m => m.type === 'preventive').length,
                            maintenanceHistory.filter(m => m.type === 'corrective').length,
                            maintenanceHistory.filter(m => new Date(m.date) > new Date()).length
                          ],
                          backgroundColor: 'rgba(100, 116, 139, 0.8)',
                          borderColor: 'rgba(100, 116, 139, 1)',
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">En maintenance préventive</span>
                      <span className="text-sm font-medium text-slate-900">
                        {maintenanceHistory.filter(m => m.type === 'preventive').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">En maintenance corrective</span>
                      <span className="text-sm font-medium text-slate-900">
                        {maintenanceHistory.filter(m => m.type === 'corrective').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Maintenances planifiées</span>
                      <span className="text-sm font-medium text-slate-900">
                        {maintenanceHistory.filter(m => new Date(m.date) > new Date()).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Garanties avec diagramme */}
                <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Garanties</h3>
                  <div className="h-48 mb-4">
                    <Pie
                      data={{
                        labels: ['Sous garantie', 'Expiration < 30 jours', 'Expirées'],
                        datasets: [{
                          data: [
                            equipements.filter(e => e.date_garantie && new Date(e.date_garantie) > new Date()).length,
                            equipements.filter(e => {
                              if (!e.date_garantie) return false;
                              const daysUntilExpiry = Math.ceil((new Date(e.date_garantie).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
                            }).length,
                            equipements.filter(e => e.date_garantie && new Date(e.date_garantie) <= new Date()).length
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(234, 179, 8, 1)',
                            'rgba(239, 68, 68, 1)'
                          ],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              font: {
                                size: 11
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Sous garantie</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => e.date_garantie && new Date(e.date_garantie) > new Date()).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Expiration moins de 30 jours</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => {
                          if (!e.date_garantie) return false;
                          const daysUntilExpiry = Math.ceil((new Date(e.date_garantie).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Garanties expirées</span>
                      <span className="text-sm font-medium text-slate-900">
                        {equipements.filter(e => e.date_garantie && new Date(e.date_garantie) <= new Date()).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau des alertes */}
              <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200 mb-6">
                <h3 className="text-base font-medium text-slate-900 mb-4">Alertes Actives</h3>
                <div className="space-y-3">
                  {smartAlerts
                    .sort((a, b) => {
                      const priorityOrder = { high: 0, medium: 1, low: 2 };
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    })
                    .slice(0, 5)
                    .map(alert => (
                      <div 
                        key={alert.id}
                        className={`p-3 rounded-md ${
                          alert.priority === 'high' ? 'bg-slate-50 border border-slate-200' :
                          alert.priority === 'medium' ? 'bg-slate-50 border border-slate-200' :
                          'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(alert.date).toLocaleString()}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            alert.priority === 'high' ? 'bg-slate-200 text-slate-700' :
                            alert.priority === 'medium' ? 'bg-slate-200 text-slate-700' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {alert.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Favoris button with professional styling */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowFavorites(!showFavorites)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-md shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {showFavorites ? "Tous les équipements" : "Favoris"}
                </button>
              </div>

              {/* Equipment grid with professional styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(showFavorites ? filteredEquipements.filter(equip => favorites.includes(equip.id)) : filteredEquipements).map((equip) => {
                  const prediction = predictions.find(p => p.equipementId === equip.id);
                  const ratings = equipmentRatings.filter(r => r.equipementId === equip.id);
                  const avgRating = ratings.length > 0
                    ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
                    : 0;

                  return (
                    <div
                      key={equip.id}
                      className="bg-white rounded-md shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-medium text-slate-900">{equip.nom_equipement}</h3>
                          <p className="text-sm text-slate-500">{equip.code_imo}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedEquipment(equip);
                              setShowAR(true);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleFavorite(equip.id)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Predictions with professional styling */}
                      {prediction && (
                        <div className="mb-3 p-2 bg-slate-50 rounded-md">
                          <h4 className="text-xs font-medium text-slate-600 mb-1">Prévisions IA</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">Stock prévu:</span>
                              <span className="ml-1 font-medium text-slate-700">{prediction.predictedStock}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Prochaine maintenance:</span>
                              <span className="ml-1 font-medium text-slate-700">
                                {prediction.nextMaintenance.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ratings with professional styling */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= avgRating ? 'text-slate-700' : 'text-slate-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">
                            {ratings.length} évaluation{ratings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Actions with professional styling */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToCart(equip)}
                          className="flex-1 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
                        >
                          Ajouter au panier
                        </button>
                        <button
                          onClick={() => addMaintenance(equip.id, 'preventive', 'Maintenance préventive programmée')}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-200 transition-colors"
                        >
                          Maintenance
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Shopping Cart with professional styling */}
        <AnimatePresence>
          {showCart && (
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-end z-50"
              onClick={() => !isProcessing && !orderPlaced && setShowCart(false)}
            >
              <div
                className="bg-white w-full max-w-md overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-slate-900 flex items-center">
                      <ShoppingCart size={18} className="mr-2" />
                      Panier
                    </h2>
                    {!isProcessing && !orderPlaced && (
                      <button 
                        onClick={() => setShowCart(false)} 
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {orderPlaced ? (
                    <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-3">
                        <CheckCircle size={32} className="text-slate-700" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Commande envoyée!</h3>
                      <p className="text-slate-500 mt-1">Votre commande a été traitée avec succès.</p>
                    </div>
                  ) : cart.length > 0 ? (
                    <>
                      <div className="divide-y divide-slate-200">
                        {cart.map((item) => (
                          <div 
                            key={item.id} 
                            className="py-3"
                          >
                            <div className="flex justify-between">
                              <div>
                                <h3 className="text-sm font-medium text-slate-900">{item.nom_equipement}</h3>
                                <p className="text-xs text-slate-500">{item.code_imo}</p>
                              </div>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <div className="flex items-center border rounded-md">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="px-2 py-1 text-slate-800">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                                  disabled={item.quantity >= item.nombre}
                                >
                                  +
                                </button>
                              </div>
                              <p className="text-xs text-slate-500">
                                {item.nombre} disponible{item.nombre > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex justify-between mb-3">
                          <span className="text-sm font-medium text-slate-900">Total des articles</span>
                          <span className="text-sm font-medium text-slate-900">{totalItems}</span>
                        </div>

                        <button
                          disabled={isProcessing}
                          onClick={placeOrder}
                          className={`w-full py-2 px-3 rounded-md text-white text-sm font-medium flex justify-center items-center ${
                            isProcessing ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'
                          } transition-colors`}
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw size={14} className="mr-2 animate-spin" />
                              Traitement...
                            </>
                          ) : (
                            <>
                              <Truck size={14} className="mr-2" />
                              Valider la commande
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <PackageCheck size={40} className="mx-auto text-slate-300 mb-3" />
                      <h3 className="text-base font-medium text-slate-900">Votre panier est vide</h3>
                      <p className="text-slate-500 mt-1">Parcourez le catalogue pour ajouter des équipements</p>
                      <button
                        onClick={() => {
                          setShowCart(false)
                          setActiveTab("catalogue")
                        }}
                        className="mt-4 text-slate-600 hover:text-slate-900 text-sm font-medium"
                      >
                        Retour au catalogue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Notifications with professional styling */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded-md shadow-sm ${
                notification.type === 'warning' ? 'bg-slate-100 border border-slate-300' :
                notification.type === 'error' ? 'bg-slate-100 border border-slate-300' :
                notification.type === 'success' ? 'bg-slate-100 border border-slate-300' :
                'bg-slate-100 border border-slate-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{notification.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => 
                    prev.filter(n => n.id !== notification.id)
                  )}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Connection indicator with professional styling */}
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-3 py-1.5 rounded-md shadow-sm ${
              isOnline ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-slate-700' : 'bg-slate-500'
              }`} />
              <span className="text-xs font-medium">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* Maintenance mode with professional styling */}
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`px-3 py-1.5 rounded-md shadow-sm ${
              maintenanceMode 
                ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">
                {maintenanceMode ? 'Mode Maintenance' : 'Mode Normal'}
              </span>
            </div>
          </button>
        </div>

        {/* Mode AR */}
        {showAR && selectedEquipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-xl font-bold mb-4">AR View - {selectedEquipment?.nom_equipement}</h3>
              <div className="aspect-video bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                <p className="text-slate-500">AR View to be implemented</p>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowAR(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Interactive Tutorial */}
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-xl font-bold mb-4">Interactive Tutorial</h3>
              <div className="space-y-4">
                <p>Welcome to the intelligent Sagemcom store!</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Use the advanced search to quickly find your equipment</li>
                  <li>Consult stock predictions to anticipate your needs</li>
                  <li>Follow maintenance history for each equipment</li>
                  <li>Share your equipment lists with your colleagues</li>
                </ul>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Start
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Panneau intelligent */}
        <motion.div
          initial={{ x: -400 }}
          animate={{ x: showSmartPanel ? 0 : -400 }}
          className="fixed left-0 top-0 h-full w-96 bg-white shadow-lg z-40 overflow-y-auto"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Intelligence Artificielle</h2>
              <button
                onClick={() => setShowSmartPanel(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Alertes intelligentes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Alertes</h3>
              <div className="space-y-3">
                {smartAlerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg ${
                      alert.priority === 'high' ? 'bg-rose-50 border border-rose-200' :
                      alert.priority === 'medium' ? 'bg-amber-50 border border-amber-200' :
                      'bg-sky-50 border border-sky-200'
                    } border`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(alert.date).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setSmartAlerts(prev => prev.filter(a => a.id !== alert.id))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Suggestions intelligentes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Suggestions</h3>
              <div className="space-y-3">
                {smartSuggestions.map(suggestion => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            suggestion.type === 'replacement' ? 'bg-rose-100 text-rose-800' :
                            suggestion.type === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                            'bg-sky-100 text-sky-800'
                          }`}>
                            {suggestion.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            Priorité: {suggestion.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800">{suggestion.reason}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(suggestion.date).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bouton pour ouvrir le panneau intelligent */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSmartPanel(true)}
          className="fixed left-4 top-20 z-30 bg-white p-3 rounded-lg shadow-lg border border-slate-200"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-slate-800">IA</span>
          </div>
        </motion.button>

        {/* Ajouter le composant AjouterEquipementForm uniquement en mode maintenance */}
        {maintenanceMode && <AjouterEquipementForm />}

        {/* Panneau latéral pour afficher les techniciens */}
        {showTechniciansPanel && (
          <div className="fixed top-20 right-4 bg-white shadow-lg p-4 rounded z-50 w-80 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Techniciens</h3>
              <button onClick={() => setShowTechniciansPanel(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <ul>
              {techniciens.length === 0 ? (
                <li className="text-slate-500">Aucun technicien trouvé.</li>
              ) : (
                techniciens.map(t => {
                  // Si une demande existe déjà pour ce technicien, on l'affiche, sinon on choisit 2 ou 3 équipements aléatoires
                  const demande = technicienDemandes[t.id];
                  let assignedEquipements: Equipement[];
                  const demandeExiste = demande && demande.length > 0;
                  if (demandeExiste) {
                    assignedEquipements = demande;
                  } else {
                    const randomCount = Math.floor(Math.random() * 2) + 2; // 2 ou 3
                    const shuffled = equipements.slice().sort(() => 0.5 - Math.random());
                    assignedEquipements = shuffled.slice(0, randomCount);
                  }
                  return (
                    <li key={t.id} className="py-2 border-b last:border-b-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {t.image && <img src={t.image} alt="avatar" className="w-8 h-8 rounded-full" />}
                        <div className="flex-1">
                          <div className="font-medium">{t.prenom} {t.nom}</div>
                          <div className="text-xs text-slate-500">{t.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs"
                            onClick={async () => {
                              // Supprimer la demande du technicien
                              const result = await supprimerDemandeTechnicien(t.id);
                              if (result.success) {
                                // Supprimer de l'état local
                                setTechnicienDemandes(prev => {
                                  const newState = { ...prev };
                                  delete newState[t.id];
                                  return newState;
                                });
                                showNotification(`Demande refusée et supprimée pour ${t.prenom} ${t.nom}`, 'error');
                              } else {
                                showNotification(`Erreur lors de la suppression: ${result.message}`, 'error');
                              }
                            }}
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                      {/* Liste des équipements demandés */}
                      <ul className="ml-10 mt-1 list-disc text-xs text-slate-600">
                        {assignedEquipements.map(e => (
                          <li key={e.id}>
                            <span className="font-medium text-slate-800">{e.nom_equipement}</span> — {e.designation}
                          </li>
                        ))}
                      </ul>
                      {!demandeExiste && (
                        <button
                          className="ml-10 mt-2 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs w-fit"
                          onClick={async () => {
                            setTechnicienDemandes(prev => ({ ...prev, [t.id]: assignedEquipements }));
                            showNotification(`Sélection validée pour ${t.prenom} ${t.nom}`, 'success');
                          }}
                        >
                          Valider la sélection
                        </button>
                      )}
                      {demandeExiste && (
                        <div className="ml-10 mt-2 flex gap-2">
                          <button
                            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs"
                            onClick={async () => {
                              // Supprimer la demande après validation
                              const result = await supprimerDemandeTechnicien(t.id);
                              if (result.success) {
                                // Supprimer de l'état local
                                setTechnicienDemandes(prev => {
                                  const newState = { ...prev };
                                  delete newState[t.id];
                                  return newState;
                                });
                                showNotification(`Demande validée et supprimée pour ${t.prenom} ${t.nom}`, 'success');
                              } else {
                                showNotification(`Erreur lors de la suppression: ${result.message}`, 'error');
                              }
                            }}
                          >
                            Valider et supprimer
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}