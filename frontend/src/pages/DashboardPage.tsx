import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  createGeneration,
  deleteGeneration,
  getGeneration,
  listGenerations,
  type Generation,
} from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Download, Trash2, AlertCircle, ImageIcon } from 'lucide-react';

const STYLES = [
  { id: 'corporate', label: 'Corporate', desc: 'Clean studio, neutral background' },
  { id: 'startup', label: 'Startup', desc: 'Warm, approachable, modern' },
  { id: 'developer', label: 'Developer', desc: 'Smart casual, friendly' },
  { id: 'formal', label: 'Formal', desc: 'Elegant, composed portrait' },
] as const;

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('corporate');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
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
      }, 3000);
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
                <span className="text-sm font-medium">Photo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer overflow-hidden
                    ${previewUrl ? 'border-primary/50 hover:border-primary' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                >
                  {previewUrl ? (
                    <div className="group w-full relative aspect-[3/4] rounded-md overflow-hidden bg-muted">
                       <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="size-4"/> Change photo</span>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto size-10 text-muted-foreground/50 mb-4" />
                      <p className="text-sm font-medium mb-1">Click to upload photo</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Style</span>
                <div className="grid gap-3">
                  {STYLES.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedStyle === s.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50 hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="radio"
                          name="style"
                          value={s.id}
                          checked={selectedStyle === s.id}
                          onChange={() => setSelectedStyle(s.id)}
                          className="size-4 text-primary focus:ring-primary border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium text-foreground block">{s.label}</span>
                        <span className="text-muted-foreground">{s.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedFile || generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <><Loader2 className="mr-2 size-5 animate-spin" /> Generating...</>
                ) : (
                  'Generate Headshot'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results & History */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {currentGen && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight">Current Result</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground capitalize font-medium">{currentGen.style}</span>
                  <Badge variant={badgeVariant(currentGen.status) as any} className="capitalize">
                    {currentGen.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-muted/30">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Original</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 aspect-[3/4] bg-muted flex items-center justify-center">
                    {currentGen.original_image_url ? (
                      <img src={currentGen.original_image_url} alt="Original" className="w-full h-full object-cover" />
                    ) : (
                      <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
                    )}
                  </CardContent>
                </Card>
                <Card className="overflow-hidden relative group">
                  <CardHeader className="py-3 px-4 border-b bg-muted/30">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 aspect-[3/4] bg-muted flex flex-col items-center justify-center text-center">
                    {currentGen.status === 'completed' && currentGen.generated_image_url ? (
                      <>
                        <img src={currentGen.generated_image_url} alt="Generated" className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button asChild size="sm" className="shadow-lg rounded-full px-6">
                            <a href={currentGen.generated_image_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 size-4" /> Download
                            </a>
                          </Button>
                        </div>
                      </>
                    ) : currentGen.status === 'failed' ? (
                      <div className="px-6">
                        <AlertCircle className="size-10 text-destructive mb-3 mx-auto" />
                        <p className="text-sm font-medium text-destructive">{currentGen.error_message || 'Generation failed'}</p>
                      </div>
                    ) : (
                      <div className="px-6 flex flex-col items-center">
                        <Loader2 className="size-10 animate-spin text-primary mb-4" />
                        <p className="text-sm font-medium mb-1">
                          {currentGen.status === 'pending' ? 'In Queue' : 'AI Processing'}
                        </p>
                        <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds.</p>
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
