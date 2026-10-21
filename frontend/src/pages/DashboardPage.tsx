import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  checkFaceQuality,
  createGeneration,
  deleteGeneration,
  getGeneration,
  listGenerations,
  type FaceCheckResult,
  type Generation,
} from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  ImageIcon,
  CheckCircle2,
  Sparkles,
  Circle,
  Square,
  ShieldCheck,
} from 'lucide-react';

const STYLES = [
  {
    id: 'studio_minimal',
    label: 'Studio Off-White',
    desc: 'Clean warm off-white studio wall with natural soft key lighting (like sample)',
    gradient: 'from-[#fbfaf9] via-[#f5f3ef] to-[#ebe7e1]',
    borderColor: 'border-[#e4ded5]',
    tag: 'Recommended',
  },
  {
    id: 'studio_grey',
    label: 'Executive Slate Grey',
    desc: 'Classic textured slate backdrop with gentle studio vignette',
    gradient: 'from-[#c2c7cf] via-[#9fa5ae] to-[#797f88]',
    borderColor: 'border-[#949aa3]',
  },
  {
    id: 'office_blur',
    label: 'Modern Glass Office',
    desc: 'Contemporary architectural interior with creamy depth-of-field bokeh',
    gradient: 'from-[#eef5fc] via-[#d6e3f0] to-[#b7c9dc]',
    borderColor: 'border-[#bdd0e4]',
  },
  {
    id: 'warm_lounge',
    label: 'Warm Executive Interior',
    desc: 'Warm ambient lighting & upscale wood tones for an approachable executive look',
    gradient: 'from-[#f7efe6] via-[#e8dacf] to-[#cfbcab]',
    borderColor: 'border-[#cbbab0]',
  },
  {
    id: 'outdoor_bokeh',
    label: 'Natural Daylight Bokeh',
    desc: 'Soft outdoor greenery and crisp morning sunlight',
    gradient: 'from-[#f2f8f4] via-[#d9ebe0] to-[#b8d6c3]',
    borderColor: 'border-[#b5d3c0]',
  },
] as const;

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('studio_minimal');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Face clarity check state
  const [checkingFace, setCheckingFace] = useState(false);
  const [faceCheck, setFaceCheck] = useState<FaceCheckResult | null>(null);

  // Avatar view mode: circular (sample style) vs full square
  const [isCircular, setIsCircular] = useState(true);

  const [currentGen, setCurrentGen] = useState<Generation | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await listGenerations(0, 50);
      setGenerations(data.generations);
    } catch {
      /* silent */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setCurrentGen(null);
    setFaceCheck(null);

    // Run instant face clarity check
    setCheckingFace(true);
    try {
      const checkRes = await checkFaceQuality(file);
      setFaceCheck(checkRes);
      if (!checkRes.is_valid) {
        setError(checkRes.message);
      }
    } catch {
      // Backend validation will catch it if offline
    } finally {
      setCheckingFace(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    if (faceCheck && !faceCheck.is_valid) {
      setError(faceCheck.message);
      return;
    }

    setGenerating(true);
    setError('');
    setCurrentGen(null);

    try {
      const gen = await createGeneration(selectedFile, selectedStyle);
      setCurrentGen(gen);

      pollRef.current = setInterval(async () => {
        try {
          const updated = await getGeneration(gen.id);
          setCurrentGen(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setGenerating(false);
            await loadHistory();
            if (updated.status === 'failed') {
              setError(updated.error_message || 'Generation failed. Please try again.');
            }
          }
        } catch {
          /* keep polling */
        }
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start generation.');
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this generation?')) return;
    try {
      await deleteGeneration(id);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      if (currentGen?.id === id) setCurrentGen(null);
    } catch {
      /* silent */
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const badgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md text-sm font-bold">U</span>
            <span className="text-xl font-bold tracking-tighter">unfumble</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Headshot</CardTitle>
              <CardDescription>Upload a photo and choose a style</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Portrait Photo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 transition-all cursor-pointer overflow-hidden
                    ${previewUrl ? 'border-primary/50 hover:border-primary' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                >
                  {previewUrl ? (
                    <div className="group w-full relative aspect-square max-w-[260px] mx-auto rounded-lg overflow-hidden bg-muted shadow-inner">
                       <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-white text-xs font-semibold flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                           <Upload className="size-3.5"/> Change photo
                         </span>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                        <Upload className="size-6" />
                      </div>
                      <p className="text-sm font-semibold mb-1">Click to upload portrait</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or WebP (max 10MB)</p>
                    </div>
                  )}
                </div>

                {/* Instant Face Clarity & Quality Indicator */}
                {checkingFace && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted text-xs text-muted-foreground animate-pulse">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span>Analyzing face clarity, sharpness & lighting...</span>
                  </div>
                )}
                {!checkingFace && faceCheck && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium border ${
                      faceCheck.is_valid
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                        : 'bg-destructive/10 border-destructive/25 text-destructive'
                    }`}
                  >
                    {faceCheck.is_valid ? (
                      <>
                        <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Face verified</span>
                          <span className="opacity-90">{faceCheck.message}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Photo quality notice</span>
                          <span className="opacity-90">{faceCheck.message}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Background & Studio Lighting Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Studio Background</span>
                  <span className="text-xs text-muted-foreground">Select backdrop</span>
                </div>
                <div className="grid gap-2.5">
                  {STYLES.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedStyle === s.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                          : 'border-border hover:bg-muted/40 hover:border-muted-foreground/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="style"
                        value={s.id}
                        checked={selectedStyle === s.id}
                        onChange={() => setSelectedStyle(s.id)}
                        className="sr-only"
                      />
                      {/* Gradient Backdrop Swatch Preview */}
                      <div
                        className={`size-10 rounded-lg bg-gradient-to-b ${s.gradient} border ${s.borderColor} shadow-inner shrink-0 flex items-center justify-center`}
                      >
                        {selectedStyle === s.id && (
                          <CheckCircle2 className="size-4 text-primary fill-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate block">
                            {s.label}
                          </span>
                          {'tag' in s && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                              {s.tag}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {s.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedFile || generating || (faceCheck !== null && !faceCheck.is_valid)}
                className="w-full shadow-md font-semibold"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Generating Studio Headshot...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-5" />
                    Generate Professional Headshot
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results & History */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {currentGen && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold tracking-tight">Current Result</h3>
                  <Badge variant={badgeVariant(currentGen.status) as any} className="capitalize">
                    {currentGen.status}
                  </Badge>
                </div>

                {/* View Mode Switcher: Circular Avatar vs Square Photo */}
                {currentGen.status === 'completed' && currentGen.generated_image_url && (
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border text-xs">
                    <button
                      type="button"
                      onClick={() => setIsCircular(true)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                        isCircular
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Circle className="size-3.5" />
                      <span>Circular Avatar (Sample)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCircular(false)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                        !isCircular
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Square className="size-3.5" />
                      <span>Square Photo</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="py-2.5 px-4 border-b bg-muted/40">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Original Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {currentGen.original_image_url ? (
                      <img src={currentGen.original_image_url} alt="Original" className="w-full h-full object-cover" />
                    ) : (
                      <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
                    )}
                  </CardContent>
                </Card>

                {/* Generated Result Card */}
                <Card className="overflow-hidden relative group">
                  <CardHeader className="py-2.5 px-4 border-b bg-muted/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" /> Studio Headshot
                    </CardTitle>
                    <span className="text-xs text-muted-foreground capitalize font-medium">
                      {currentGen.style.replace('_', ' ')}
                    </span>
                  </CardHeader>

                  <CardContent
                    className={`p-0 aspect-square flex flex-col items-center justify-center text-center overflow-hidden transition-all ${
                      isCircular && currentGen.status === 'completed'
                        ? 'bg-[#18191b] p-6'
                        : 'bg-muted'
                    }`}
                  >
                    {currentGen.status === 'completed' && currentGen.generated_image_url ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={currentGen.generated_image_url}
                          alt="Generated Studio Portrait"
                          className={`transition-all duration-300 object-cover ${
                            isCircular
                              ? 'size-64 rounded-full shadow-2xl ring-4 ring-white/10'
                              : 'w-full h-full'
                          }`}
                        />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button asChild size="sm" className="shadow-xl rounded-full px-5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                            <a href={currentGen.generated_image_url} download={`headshot_${currentGen.id}.jpg`} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 size-4" /> Download Headshot
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : currentGen.status === 'failed' ? (
                      <div className="px-6 py-8">
                        <AlertCircle className="size-10 text-destructive mb-3 mx-auto" />
                        <p className="text-sm font-semibold text-destructive mb-1">Generation Failed</p>
                        <p className="text-xs text-muted-foreground">{currentGen.error_message || 'Please try another portrait'}</p>
                      </div>
                    ) : (
                      <div className="px-6 py-8 flex flex-col items-center">
                        <Loader2 className="size-10 animate-spin text-primary mb-4" />
                        <p className="text-sm font-semibold mb-1">
                          {currentGen.status === 'pending' ? 'Analyzing Portrait...' : 'Rendering Studio Headshot...'}
                        </p>
                        <p className="text-xs text-muted-foreground">Applying studio backdrop & portrait lighting</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight">History</h3>
              {!loadingHistory && (
                <span className="text-sm text-muted-foreground font-medium">
                  {generations.length} item{generations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loadingHistory ? (
              <Card className="flex items-center justify-center p-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </Card>
            ) : generations.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ImageIcon className="size-6 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-medium mb-1">No generations yet</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Upload a photo on the left to create your first professional headshot.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {generations.map((gen) => (
                  <Card key={gen.id} className="overflow-hidden group">
                    <div className="relative aspect-square bg-muted">
                      {gen.generated_image_url ? (
                        <img src={gen.generated_image_url} alt="Generated" className="w-full h-full object-cover" />
                      ) : gen.original_image_url ? (
                        <img src={gen.original_image_url} alt="Original" className="w-full h-full object-cover grayscale opacity-50" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="size-10 text-muted-foreground/30" />
                         </div>
                      )}
                      
                      <div className="absolute top-2 right-2">
                        <Badge variant={badgeVariant(gen.status) as any} className="shadow-sm capitalize text-[10px] px-2 py-0">
                          {gen.status}
                        </Badge>
                      </div>

                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                         {gen.generated_image_url && (
                           <Button asChild size="icon" variant="secondary" className="rounded-full shadow-sm">
                              <a href={gen.generated_image_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="size-4" />
                              </a>
                           </Button>
                         )}
                         <Button size="icon" variant="destructive" className="rounded-full shadow-sm" onClick={() => handleDelete(gen.id)}>
                            <Trash2 className="size-4" />
                         </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-semibold capitalize">{gen.style}</span>
                         <span className="text-xs text-muted-foreground">
                           {new Date(gen.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                         </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
