using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PromoGest.Application.Services;

namespace PromoGest.Infrastructure.HostedServices;

public sealed class ProjectSalesReservationExpiryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProjectSalesReservationExpiryWorker> _logger;

    public ProjectSalesReservationExpiryWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ProjectSalesReservationExpiryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
                await using var scope = _scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<ProjectSalesReservationExpiryProcessor>();
                var expired = await processor.ProcessDueAsync(stoppingToken);
                if (expired > 0)
                    _logger.LogInformation("Automatically expired {ReservationCount} project reservations.", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Project sales reservation expiry processing failed. The next cycle will retry.");
            }
        }
    }
}
