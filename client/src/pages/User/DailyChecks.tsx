import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  Button,
  Flex,
  VStack,
  Spinner,
  Icon,
  Box,
  Input,
  Badge,
  SimpleGrid,
  Portal,
  Dialog,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiCalendar, FiArrowLeft, FiVideo, FiDownload, FiUpload, FiCheckCircle } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";

export default function DailyChecks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);
  
  // Daily Checks state
  const [dcListLoading, setDcListLoading] = useState(false);
  const [dcList, setDcList] = useState<any[]>([]);
  const [dcSelected, setDcSelected] = useState<any | null>(null);
  const [dcDetailLoading, setDcDetailLoading] = useState(false);
  const [dcDetail, setDcDetail] = useState<any | null>(null);
  const [videoReqLoading, setVideoReqLoading] = useState(false);

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoCheckLoading, setVideoCheckLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Coach requirements state
  const [requirements, setRequirements] = useState<any[]>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);

  useEffect(() => {
    // Automatically load Daily Checks when component mounts
    loadDailyCheckList();
    loadRequirements();
  }, [userIdParam, token]);

  // Helper function to check if daily check is completed today
  const isDailyCheckCompletedToday = () => {
    const today = new Date().toDateString();
    return dcList.some(check => {
      const checkDate = new Date(check.date).toDateString();
      return checkDate === today;
    });
  };

  const loadDailyCheckList = async () => {
    try {
      setDcListLoading(true);
      const uid = userIdParam == null ? user.id : userIdParam;
      const res = await fetch(
        `http://localhost:3000/dailyCheck/listWithViolations/${uid}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 403) {
          toaster.create({ title: "Keine Berechtigung", type: "error" });
        } else {
          toaster.create({ title: "Laden fehlgeschlagen", type: "error" });
        }
        setDcListLoading(false);
        return;
      }
      const list = await res.json();
      setDcList(list || []);
      setDcListLoading(false);
      // Preselect first
      if (list && list.length > 0) {
        selectDailyCheck(list[0]);
      } else {
        setDcSelected(null);
        setDcDetail(null);
      }
    } catch (e) {
      console.error(e);
      setDcListLoading(false);
      toaster.create({ title: "Fehler beim Laden", type: "error" });
    }
  };

  const selectDailyCheck = async (item: any) => {
    setDcSelected(item);
    setDcDetail(null);
    setDcDetailLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/dailyCheck/violations/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const detail = await res.json();
      setDcDetail(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDcDetailLoading(false);
    }
  };

  const handleRequestVideo = async (dailyCheckId: string) => {
    try {
      setVideoReqLoading(true);
      const res = await fetch(
        `http://localhost:3000/dailyCheck/video/request/${dailyCheckId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.status === "HOT") {
          toaster.create({ title: "Video bereit (Hot)", type: "success" });
          handleDownload(dailyCheckId);
        } else if (data.status === "READY") {
          toaster.create({ title: "Video wiederhergestellt", type: "success" });
          handleDownload(dailyCheckId);
        } else {
          toaster.create({ title: "Wiederherstellung angefragt", type: "info" });
        }
        await loadDailyCheckList();
      } else if (res.status === 202) {
        toaster.create({ title: "Wiederherstellung angefragt", type: "info" });
      } else {
        toaster.create({ title: "Anfrage fehlgeschlagen", type: "error" });
      }
    } catch (e) {
      console.error(e);
      toaster.create({ title: "Anfrage fehlgeschlagen", type: "error" });
    } finally {
      setVideoReqLoading(false);
    }
  };

  const handleDownload = async (dailyCheckId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/dailyCheck/video/download/${dailyCheckId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toaster.create({ title: "Nicht autorisiert", description: "Bitte logge dich erneut ein", type: "error" });
        } else if (response.status === 404) {
          toaster.create({ title: "Video nicht gefunden", type: "error" });
        } else {
          toaster.create({ title: "Download fehlgeschlagen", type: "error" });
        }
        return;
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from response headers
      const disposition = response.headers.get('content-disposition');
      let filename = `daily-check-${dailyCheckId}.mp4`;
      if (disposition && disposition.includes('filename=')) {
        const filenameMatch = disposition.match(/filename="?(.+)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toaster.create({ title: "Download gestartet", type: "success" });
    } catch (error) {
      console.error('Download error:', error);
      toaster.create({ title: "Download fehlgeschlagen", description: "Ein Fehler ist aufgetreten", type: "error" });
    }
  };

  const loadRequirements = async () => {
    try {
      setRequirementsLoading(true);
      const uid = userIdParam == null ? user.id : userIdParam;
      
      // First get coach info
      const coachRes = await fetch(`http://localhost:3000/users/getCoachByUser/${uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!coachRes.ok) {
        console.log("Failed to get coach:", coachRes.status);
        setRequirements([]);
        return;
      }
      
      const coachData = await coachRes.json();
      console.log("Coach data:", coachData);
      
      // Then get requirements from coach
      const reqRes = await fetch(`http://localhost:3000/requirement/getRequirementByCoach/${coachData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!reqRes.ok) {
        console.log("Failed to get requirements:", reqRes.status);
        setRequirements([]);
        return;
      }
      
      const reqData = await reqRes.json();
      setRequirements(reqData.requirement || []);
    } catch (e) {
      console.error("Error loading requirements:", e);
      setRequirements([]);
    } finally {
      setRequirementsLoading(false);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) {
      toaster.create({ title: "Fehler", description: "Bitte wähle zuerst ein Video aus", type: "error" });
      return;
    }

    try {
      setVideoCheckLoading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);
      setUploadStatusText('Video wird hochgeladen...');

      const formData = new FormData();
      formData.append("video", videoFile);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Upload progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(progress);
          setUploadStatusText(`Video wird hochgeladen... ${progress}%`);
        }
      });

      // Request completion
      xhr.addEventListener('load', async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadStatus('processing');
            setUploadProgress(100);
            setUploadStatusText('Video wird verarbeitet...');
            
            const result = JSON.parse(xhr.responseText);
            console.log("Antwort vom Server:", result);
            
            // Check if server responded with error despite 200 status
            if (result.error) {
              throw new Error(result.error);
            }
            
            // Simulate processing time (since Gemini analysis might take time)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setUploadStatus('completed');
            setUploadStatusText('Video erfolgreich hochgeladen und verarbeitet!');
            
            toaster.create({ 
              title: "Video hochgeladen", 
              description: "Dein Daily Check wurde erfolgreich erstellt!", 
              type: "success" 
            });
            
            // Clear the file input and reset states
            setVideoFile(null);
            const fileInput = document.getElementById("video-upload-daily") as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            
            // Reset after 3 seconds
            setTimeout(() => {
              setUploadStatus('idle');
              setUploadProgress(0);
              setUploadStatusText('');
            }, 3000);
            
            // Refresh data
            await loadDailyCheckList();
          } else {
            // Handle HTTP error status
            let errorMessage = `Server-Fehler: ${xhr.status}`;
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // Keep default error message if response isn't JSON
            }
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          console.error("Upload completion error:", error);
          setUploadStatus('error');
          setUploadStatusText('Fehler beim Verarbeiten');
          toaster.create({ 
            title: "Upload fehlgeschlagen", 
            description: error.message || "Video konnte nicht verarbeitet werden", 
            type: "error" 
          });
          
          // Reset after 5 seconds on error
          setTimeout(() => {
            setUploadStatus('idle');
            setUploadProgress(0);
            setUploadStatusText('');
          }, 5000);
        }
      });

      // Error handling
      xhr.addEventListener('error', () => {
        console.error("XHR Network error");
        setUploadStatus('error');
        setUploadStatusText('Netzwerkfehler beim Upload');
        toaster.create({ 
          title: "Upload fehlgeschlagen", 
          description: "Netzwerkfehler beim Upload", 
          type: "error" 
        });
        
        // Reset after 5 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
          setUploadStatusText('');
        }, 5000);
      });

      xhr.addEventListener('timeout', () => {
        console.error("XHR Upload timeout");
        setUploadStatus('error');
        setUploadStatusText('Upload-Timeout erreicht');
        toaster.create({ 
          title: "Upload fehlgeschlagen", 
          description: "Der Upload dauerte zu lange und wurde abgebrochen", 
          type: "error" 
        });
        
        // Reset after 5 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
          setUploadStatusText('');
        }, 5000);
      });

      // Add timeout for long uploads
      xhr.timeout = 120000; // 2 minutes timeout

      // Start the upload
      const uploadUserId = userIdParam || user.id;
      xhr.open('POST', `http://localhost:3000/dailyCheck/createDailyCheck/${uploadUserId}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus('error');
      setUploadStatusText('Fehler beim Upload');
      toaster.create({ 
        title: "Upload fehlgeschlagen", 
        description: err.message || "Ein unbekannter Fehler ist aufgetreten", 
        type: "error" 
      });
    } finally {
      setVideoCheckLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDailyCheckCompletedToday()) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isDailyCheckCompletedToday()) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        toaster.create({ 
          title: "Fehler", 
          description: "Bitte wähle eine gültige Video-Datei aus", 
          type: "error" 
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const renderVideoStatus = (video: any) => {
    if (!video || !video.id) return "–";
    if (!video.archivedAt) return "Hot";
    if (video.restoreStatus) return video.restoreStatus;
    return "Archiviert";
  };

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header */}
      <Card.Root mb={6} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
        <CardHeader>
          <Flex align="center" gap={4}>
            <Button
              variant="outline"
              onClick={() => navigate(userIdParam ? `/dashboard/CUSTOMER?userId=${userIdParam}` : '/dashboard/CUSTOMER')}
            >
              <Icon as={FiArrowLeft} mr={2} />
              Zurück zum Dashboard
            </Button>
            <Box>
              <Heading size="lg" color="var(--color-text)">Daily Checks</Heading>
              <Text color="var(--color-muted)">Übersicht deiner täglichen Video-Uploads und Bewertungen</Text>
            </Box>
          </Flex>
        </CardHeader>
      </Card.Root>

      {/* Video Upload Section - Hidden for Coaches and Admins */}
      {user?.role === 'CUSTOMER' && (
        <Card.Root 
          mb={6} 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor={isDailyCheckCompletedToday() ? "green.400" : "var(--color-border)"}
          opacity={isDailyCheckCompletedToday() ? 0.7 : 1}
          position="relative"
        >
          {isDailyCheckCompletedToday() && (
            <Box
              position="absolute"
              top={3}
              right={3}
              bg="green.500"
              color="white"
              px={2}
              py={1}
              rounded="md"
              fontSize="xs"
              fontWeight="bold"
              zIndex={1}
            >
              ✅ Heute bereits erledigt
            </Box>
          )}
          <CardHeader>
            <Heading size="md" color={isDailyCheckCompletedToday() ? "var(--color-muted)" : "var(--color-text)"}>
              Video hochladen
            </Heading>
            <Text color="var(--color-muted)" fontSize="sm">
              {isDailyCheckCompletedToday() 
                ? "Du hast heute bereits einen Daily Check erstellt. Komm morgen wieder!"
                : "Lade dein tägliches Video hoch, um es gegen die Coach-Kriterien bewerten zu lassen"
              }
            </Text>
          </CardHeader>
          <CardBody>
            {/* Custom File Upload Area */}
            <VStack gap={4} align="stretch">
              <Box
                position="relative"
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={
                  isDailyCheckCompletedToday() ? "gray.300" :
                  isDragOver ? "blue.400" : 
                  videoFile ? "green.400" : "var(--color-border)"
                }
                borderRadius="lg"
                p={8}
                textAlign="center"
                bg={
                  isDailyCheckCompletedToday() ? "gray.50" :
                  isDragOver ? "blue.50" : 
                  videoFile ? "green.50" : "var(--color-surface)"
                }
                cursor={isDailyCheckCompletedToday() ? "not-allowed" : "pointer"}
                transition="all 0.2s ease"
                _hover={!isDailyCheckCompletedToday() ? {
                  borderColor: "blue.400",
                  bg: "blue.50"
                } : {}}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isDailyCheckCompletedToday()) {
                    document.getElementById('video-upload-daily')?.click();
                  }
                }}
              >
                <Input
                  id="video-upload-daily"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={isDailyCheckCompletedToday() || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                  position="absolute"
                  opacity={0}
                  w="full"
                  h="full"
                  cursor="pointer"
                />
                
                <VStack gap={3}>
                  <Icon 
                    as={FiUpload} 
                    boxSize={12} 
                    color={
                      isDailyCheckCompletedToday() ? "gray.400" :
                      videoFile ? "green.500" : "blue.500"
                    } 
                  />
                  <VStack gap={1}>
                    <Text 
                      fontWeight="semibold" 
                      color={isDailyCheckCompletedToday() ? "gray.500" : "var(--color-text)"}
                    >
                      {isDailyCheckCompletedToday() ? 
                        "Upload nicht verfügbar" : 
                        videoFile ? 
                          "Video ausgewählt" : 
                          "Video hier ablegen oder klicken"
                      }
                    </Text>
                    <Text 
                      fontSize="sm" 
                      color="var(--color-muted)"
                    >
                      {isDailyCheckCompletedToday() ? 
                        "Heute bereits einen Daily Check erstellt" :
                        "Unterstützte Formate: MP4, MOV, AVI, WMV"
                      }
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            
            {videoFile && uploadStatus === 'idle' && !isDailyCheckCompletedToday() && (
              <Card.Root 
                p={4} 
                bg="rgba(34, 197, 94, 0.1)" 
                borderColor="green.500"
                borderWidth="1px"
                borderRadius="lg"
              >
                <Flex align="center" justify="space-between" gap={3}>
                  <Flex align="center" gap={3}>
                    <Icon as={FiVideo} color="green.600" boxSize={5} />
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium" color="green.700">
                        {videoFile.name}
                      </Text>
                      <Text fontSize="xs" color="green.600">
                        {((videoFile.size) / (1024 * 1024)).toFixed(2)} MB
                      </Text>
                    </VStack>
                  </Flex>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoFile(null);
                      const fileInput = document.getElementById("video-upload-daily") as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    Entfernen
                  </Button>
                </Flex>
              </Card.Root>
            )}

            {/* Upload progress */}
            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <VStack gap={2} align="stretch">
                <Text fontSize="sm" color="var(--color-muted)">{uploadStatusText}</Text>
                <Box bg="gray.200" rounded="md" overflow="hidden" h="2">
                  <Box
                    bg={uploadStatus === 'processing' ? 'blue.500' : 'green.500'}
                    h="full"
                    transition="width 0.3s ease"
                    w={`${uploadProgress}%`}
                  />
                </Box>
              </VStack>
            )}

            {uploadStatus === 'completed' && (
              <Card.Root p={3} bg="rgba(34, 197, 94, 0.1)" borderColor="green.500">
                <Flex align="center" gap={2}>
                  <Icon as={FiCheckCircle} color="green.600" />
                  <Text fontSize="sm" fontWeight="medium" color="green.700">
                    {uploadStatusText}
                  </Text>
                </Flex>
              </Card.Root>
            )}

            {uploadStatus === 'error' && (
              <Card.Root p={3} bg="rgba(239, 68, 68, 0.1)" borderColor="red.500">
                <Text fontSize="sm" fontWeight="medium" color="red.700">
                  {uploadStatusText}
                </Text>
              </Card.Root>
            )}

            <Button
              w="full"
              colorScheme={isDailyCheckCompletedToday() ? "green" : "blue"}
              onClick={handleVideoUpload}
              disabled={isDailyCheckCompletedToday() || !videoFile || videoCheckLoading || uploadStatus === 'uploading' || uploadStatus === 'processing'}
              loading={videoCheckLoading}
              size="lg"
              variant={isDailyCheckCompletedToday() ? "outline" : "solid"}
            >
              <Icon as={isDailyCheckCompletedToday() ? FiCheckCircle : FiUpload} mr={2} />
              {isDailyCheckCompletedToday() ? 'Heute bereits abgeschlossen' :
               uploadStatus === 'uploading' ? 'Video wird hochgeladen...' : 
               uploadStatus === 'processing' ? 'Video wird verarbeitet...' : 
               'Video hochladen und bewerten lassen'}
            </Button>
          </VStack>
        </CardBody>
      </Card.Root>
      )}

      {/* Coach Requirements Section */}
      <Card.Root mb={6} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
        <CardHeader>
          <Heading size="md">Coach Kriterien</Heading>
          <Text color="var(--color-muted)" fontSize="sm">
            Diese Kriterien werden bei der Bewertung deines Videos berücksichtigt
          </Text>
        </CardHeader>
        <CardBody>
          {requirementsLoading ? (
            <Flex align="center" justify="center" py={4}>
              <Spinner size="md" />
            </Flex>
          ) : requirements.length === 0 ? (
            <Card.Root p={4} bg="rgba(156, 163, 175, 0.1)" borderColor="gray.300">
              <Text color="var(--color-muted)" textAlign="center">
                Keine Kriterien vom Coach definiert
              </Text>
            </Card.Root>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {requirements.map((req: any, index: number) => (
                <Card.Root key={req.id} p={3} bg="rgba(59, 130, 246, 0.1)" borderColor="blue.300">
                  <Flex align="start" gap={3}>
                    <Badge colorScheme="blue" size="sm" mt={1}>
                      {index + 1}
                    </Badge>
                    <Box flex={1}>
                      <Text fontWeight="medium" color="var(--color-text)">
                        {req.title}
                      </Text>
                    </Box>
                  </Flex>
                </Card.Root>
              ))}
            </SimpleGrid>
          )}
        </CardBody>
      </Card.Root>

      {/* Content */}
      <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
        <CardBody>
          {dcListLoading ? (
            <Flex align="center" justify="center" py={8}><Spinner size="lg" /></Flex>
          ) : dcList.length === 0 ? (
            <Flex direction="column" align="center" justify="center" py={12} gap={4}>
              <Icon as={FiCalendar} boxSize={12} color="var(--color-muted)" />
              <Heading size="md" color="var(--color-muted)">Noch keine Daily Checks</Heading>
              <Text color="var(--color-muted)" textAlign="center">
                Sobald du dein erstes Video hochgeladen hast, siehst du hier eine Übersicht deiner Daily Checks.
              </Text>
            </Flex>
          ) : (
            <Flex gap={6} direction={{ base: "column", lg: "row" }}>
              {/* Daily Checks List */}
              <VStack align="stretch" flex={1} maxH="70vh" overflowY="auto" gap={3}>
                <Heading size="sm" mb={2}>Deine Daily Checks</Heading>
                {dcList.map((item: any) => (
                  <Card.Root 
                    key={item.id} 
                    variant={dcSelected?.id === item.id ? 'elevated' : 'outline'}
                    cursor="pointer"
                    onClick={() => selectDailyCheck(item)}
                    _hover={{ bg: "rgba(255,255,255,0.04)" }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={1}>
                          <Text fontWeight="medium">
                            {new Date(item.date).toLocaleDateString("de-DE")}
                          </Text>
                          <Text fontSize="sm" color="var(--color-muted)">
                            {item.passCount || 0} / {item.total || 0} Kriterien erfüllt
                          </Text>
                        </VStack>
                        <Flex direction="column" align="end" gap={1}>
                          <Icon as={FiVideo} color={item.passCount === item.total ? "green.500" : "yellow.500"} />
                          <Text fontSize="xs" color="var(--color-muted)">
                            {item.passCount === item.total ? "Bestanden" : "Auffällig"}
                          </Text>
                        </Flex>
                      </Flex>
                    </CardBody>
                  </Card.Root>
                ))}
              </VStack>

              {/* Daily Check Details */}
              <Card.Root flex={2} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                <CardBody>
                  {dcDetailLoading ? (
                    <Flex align="center" justify="center" py={8}><Spinner /></Flex>
                  ) : dcDetail ? (
                    <VStack align="stretch" gap={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          {new Date(dcDetail.date).toLocaleDateString("de-DE")}
                        </Heading>
                        <Text mb={4} color="var(--color-muted)">
                          Video: {renderVideoStatus(dcDetail.video)}
                        </Text>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={3}>Bewertungen</Heading>
                        <VStack align="stretch" gap={2}>
                          {dcDetail.violations.length === 0 ? (
                            <Card.Root p={4} bg="rgba(34, 197, 94, 0.1)" borderColor="green.500">
                              <Text color="green.600" fontWeight="medium">
                                ✅ Alle Kriterien erfüllt - Perfekt!
                              </Text>
                            </Card.Root>
                          ) : (
                            dcDetail.violations.map((v: any) => (
                              <Card.Root key={v.id} p={3} bg="rgba(245, 158, 11, 0.1)" borderColor="yellow.500">
                                <Text fontWeight="medium" color="yellow.700">{v.title}</Text>
                                {v.note && (
                                  <Text fontSize="sm" color="var(--color-muted)" mt={1}>{v.note}</Text>
                                )}
                              </Card.Root>
                            ))
                          )}
                        </VStack>
                      </Box>

                      {user?.role !== 'ADMIN' && dcSelected && dcDetail?.video && (
                        <Flex gap={3} wrap="wrap" mt={4}>
                          {/* Show "Herunterladen" button if video is "Hot" (not archived) */}
                          {!dcDetail.video.archivedAt ? (
                            <Button 
                              variant="outline" 
                              onClick={() => handleDownload(dcSelected.id)}
                              colorScheme="green"
                            >
                              <Icon as={FiDownload} mr={2} />
                              Herunterladen
                            </Button>
                          ) : (
                            /* Show "Video anfragen" button if video is archived (Cold Storage) */
                            <Button 
                              onClick={() => handleRequestVideo(dcSelected.id)} 
                              loading={videoReqLoading}
                              colorScheme="blue"
                            >
                              <Icon as={FiVideo} mr={2} />
                              Video anfragen
                            </Button>
                          )}
                        </Flex>
                      )}
                    </VStack>
                  ) : (
                    <Flex align="center" justify="center" py={8}>
                      <Text color="var(--color-muted)">Wähle einen Daily Check für Details</Text>
                    </Flex>
                  )}
                </CardBody>
              </Card.Root>
            </Flex>
          )}
        </CardBody>
      </Card.Root>

    </Box>
  );
}