export default function BrowsePage() {
  return (
    <div className="container-wrapper">
      <div className="container py-8">
        {/* <div className="flex flex-col gap-1 pb-8">
          <h1 className="text-3xl font-medium tracking-tight">内容浏览</h1>
          <p className="text-muted-foreground">选择要浏览的内容类型</p>
        </div> */}

        {/* <div className="grid gap-6 md:grid-cols-2">
          {navRoutesConfig.map((route) =>
            route.hideInNav ? null : (
              <Link key={route.navHref} href={route.navHref}>
                <Card className="group cursor-pointer transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-14 w-14 items-center justify-center rounded-xl transition-colors">
                        {route.label === 'Blog' ? (
                          <FileText className="h-7 w-7" />
                        ) : route.label === 'Gallery' ? (
                          <ImageIcon className="h-7 w-7" />
                        ) : (
                          <Folder className="h-7 w-7" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{route.label}</CardTitle>
                        <CardDescription>{route.title}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {route.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div> */}
      </div>
    </div>
  );
}
